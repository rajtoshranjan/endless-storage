import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from chunking.distributor import ChunkDistributor
from chunking.exceptions import InsufficientStorageError
from drive.helpers import get_active_drive
from storage.connectors import get_connector

from ..helpers import get_all_account_quotas
from ..models import File, FileChunk, FilePermission
from ..permissions import (
    HadManageFilePermission,
    HasDownloadFilePermission,
    HasUploadFilePermission,
)
from ..serializers import FileSerializer, SharedFileSerializer

logger = logging.getLogger(__name__)


class FileViewSet(ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [HadManageFilePermission]

    def get_permissions(self):
        if self.action in ("init_upload", "confirm_chunk"):
            self.permission_classes = [HasUploadFilePermission]
        elif self.action == "list":
            self.permission_classes = [IsAuthenticated]

        return super().get_permissions()

    def get_queryset(self):
        drive = get_active_drive(self.request)
        return File.objects.filter(drive=drive)

    @action(detail=False, methods=["post"], url_path="init-upload")
    def init_upload(self, request):
        """
        Initiate an upload session.

        1. Fetch quotas for all active storage accounts.
        2. Run ChunkDistributor to compute allocation.
        3. Create File record with total_chunks.
        4. Create FileChunk records (status=pending).
        5. Get a resumable upload URL for each chunk.
        6. Return file_id + chunk plan.
        """
        file_name = request.data.get("file_name")
        file_size = int(request.data.get("file_size", 0))
        mime_type = request.data.get("mime_type", "application/octet-stream")

        if not file_name:
            return Response(
                {"error": "file_name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get quotas and compute allocation
        try:
            account_quotas = get_all_account_quotas(request.user)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        distributor = ChunkDistributor()
        try:
            allocation = distributor.compute_allocation(file_size, account_quotas)
        except InsufficientStorageError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drive = get_active_drive(request)
        origin = request.META.get("HTTP_ORIGIN", request.META.get("HTTP_REFERER", ""))

        # Create file record
        file = File.objects.create(
            name=file_name,
            owner=request.user,
            drive=drive,
            mime_type=mime_type,
            file_size=file_size,
            total_chunks=len(allocation),
        )

        # Create chunk records and get upload URLs
        chunks = []
        for entry in allocation:
            FileChunk.objects.create(
                file=file,
                chunk_index=entry["chunk_index"],
                storage_account=entry["storage_account"],
                chunk_size=entry["chunk_size"],
            )

            connector = get_connector(entry["storage_account"])
            chunk_name = (
                f"{file_name}.chunk{entry['chunk_index']}"
                if len(allocation) > 1
                else file_name
            )
            upload_url = connector.create_resumable_upload(
                chunk_name, mime_type, origin=origin
            )

            chunks.append(
                {
                    "chunk_index": entry["chunk_index"],
                    "chunk_size": entry["chunk_size"],
                    "upload_url": upload_url,
                }
            )

        return Response(
            {
                "file_id": str(file.id),
                "chunks": chunks,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="confirm-chunk")
    def confirm_chunk(self, request, pk=None):
        """
        Confirm a single chunk has been uploaded.

        Updates the FileChunk record with the external file ID
        and marks it as uploaded.
        """
        file = get_object_or_404(File, id=pk, owner=request.user)

        chunk_index = request.data.get("chunk_index")
        external_chunk_id = request.data.get("external_chunk_id")

        if chunk_index is None or not external_chunk_id:
            return Response(
                {"error": "chunk_index and external_chunk_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            chunk = FileChunk.objects.get(file=file, chunk_index=int(chunk_index))
        except FileChunk.DoesNotExist:
            return Response(
                {"error": f"Chunk {chunk_index} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verify the chunk exists on the drive
        connector = get_connector(chunk.storage_account)
        try:
            metadata = connector.get_file_metadata(external_chunk_id)
        except Exception as e:
            logger.error(f"Failed to verify chunk {chunk_index}: {e}")
            return Response(
                {"error": "Failed to verify chunk on storage provider"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chunk.external_chunk_id = external_chunk_id
        chunk.chunk_size = int(metadata.get("size", chunk.chunk_size))
        chunk.upload_status = "uploaded"
        chunk.save(update_fields=["external_chunk_id", "chunk_size", "upload_status"])

        # Check if all chunks are uploaded
        total = file.total_chunks
        uploaded = file.chunks.filter(upload_status="uploaded").count()
        all_uploaded = uploaded == total

        response_data = {
            "chunk_index": chunk.chunk_index,
            "status": chunk.upload_status,
            "all_chunks_uploaded": all_uploaded,
        }

        if all_uploaded:
            serializer = FileSerializer(file, context={"request": request})
            response_data["file"] = serializer.data

        return Response(response_data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Delete all chunks from cloud storage, then delete the file record."""
        for chunk in instance.chunks.filter(upload_status="uploaded"):
            try:
                connector = get_connector(chunk.storage_account)
                connector.delete_file(chunk.external_chunk_id)
            except Exception as e:
                logger.warning(
                    f"Failed to delete chunk {chunk.chunk_index} "
                    f"from {chunk.storage_account}: {e}"
                )
        instance.delete()

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[HasDownloadFilePermission],
        url_path="download-plan",
    )
    def download_plan(self, request, pk=None):
        """
        Return per-chunk direct download URLs and access tokens.

        The client uses these to download chunks directly from the
        cloud storage provider without proxying through our server.
        Access tokens are short-lived (~1 hour) and auto-refreshed.
        """
        file = get_object_or_404(File, id=pk)
        self.check_object_permissions(request, file)

        chunks = (
            file.chunks.filter(upload_status="uploaded")
            .select_related("storage_account")
            .order_by("chunk_index")
        )

        # Refresh access tokens for each unique storage account
        account_tokens = {}
        for chunk in chunks:
            account = chunk.storage_account
            if account.id not in account_tokens:
                try:
                    connector = get_connector(account)
                    connector.refresh_credentials()
                    account.refresh_from_db(fields=["access_token"])
                except Exception:
                    pass  # Token may still be valid
                account_tokens[account.id] = account.access_token

        chunk_data = []
        for chunk in chunks:
            download_url = (
                f"https://www.googleapis.com/drive/v3/files/"
                f"{chunk.external_chunk_id}?alt=media"
            )
            chunk_data.append(
                {
                    "chunk_index": chunk.chunk_index,
                    "chunk_size": chunk.chunk_size,
                    "download_url": download_url,
                    "access_token": account_tokens[chunk.storage_account_id],
                }
            )

        return Response(
            {
                "file_name": file.name,
                "file_size": file.file_size,
                "mime_type": file.mime_type,
                "chunks": chunk_data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        serializer_class=SharedFileSerializer,
        permission_classes=[IsAuthenticated],
    )
    def shared(self, request):
        file_permissions = FilePermission.objects.filter(
            user=request.user
        ).select_related("file")
        serializer = self.get_serializer(file_permissions, many=True)
        return Response(serializer.data)
