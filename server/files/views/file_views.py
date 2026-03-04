from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404, render
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from chunking.distributor import ChunkDistributor
from chunking.downloader import ChunkDownloader
from chunking.exceptions import InsufficientStorageError
from chunking.utils import stream_as_async
from drive.helpers import get_active_drive
from endless_storage import logger
from storage.connectors import get_connector

from ..helpers import get_all_account_quotas
from ..models import File, FileChunk, FilePermission
from ..permissions import (
    HadManageFilePermission,
    HasDownloadFilePermission,
    HasUploadFilePermission,
)
from ..serializers import FileSerializer, SharedFileSerializer


class FileViewSet(ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [HadManageFilePermission]

    DOWNLOAD_TOKEN_MAX_AGE = 60  # seconds
    _download_signer = TimestampSigner(salt="file-download")

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
        url_path="download-token",
    )
    def download_token(self, request, pk=None):
        """
        Issue a signed, short-lived download token for browser-native downloads.

        The token is signed with Django's SECRET_KEY via TimestampSigner
        and embeds the file ID. It expires after DOWNLOAD_TOKEN_MAX_AGE seconds.
        """
        file = get_object_or_404(File, id=pk)
        self.check_object_permissions(request, file)

        token = self._download_signer.sign(str(file.id))

        download_url = request.build_absolute_uri(
            f"/files/{file.id}/download/?token={token}"
        )

        return Response({"download_url": download_url})

    @action(
        detail=True,
        methods=["get"],
        authentication_classes=[],
        permission_classes=[AllowAny],
        url_path="download",
    )
    def download(self, request, pk=None):
        token = request.query_params.get("token")
        if not token:
            logger.error("Download token is required")
            raise NotAuthenticated

        try:
            file_id = self._download_signer.unsign(
                token, max_age=self.DOWNLOAD_TOKEN_MAX_AGE
            )
        except SignatureExpired:
            logger.error("Download token has expired")
            raise PermissionDenied
        except BadSignature:
            logger.error("Invalid download token")
            raise PermissionDenied

        if str(pk) != file_id:
            logger.error("Token does not match this file")
            raise PermissionDenied

        file = get_object_or_404(File, id=pk)

        try:
            downloader = ChunkDownloader()
            sync_stream = downloader.stream_chunks(file)

            response = StreamingHttpResponse(
                stream_as_async(sync_stream), content_type=file.mime_type
            )
            response["Content-Disposition"] = f'attachment; filename="{file.name}"'
            if file.file_size:
                response["Content-Length"] = file.file_size
            return response
        except Exception as e:
            logger.error(f"Failed to generate download URL for share link: {e}")
            return render(request, "link_expired.html")

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
