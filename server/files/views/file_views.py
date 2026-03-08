from urllib.parse import quote

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from chunking.downloader import ChunkDownloader
from chunking.exceptions import ChunkMissingError, StorageAccountDisconnectedError
from chunking.utils import stream_as_async
from drive.helpers import get_active_drive
from endless_storage import logger
from storage.connectors import get_connector

from ..constants import DOWNLOAD_SIGNER, ChunkStatus
from ..models import File, FilePermission
from ..permissions import (
    HasDownloadFilePermission,
    HasManageFilePermission,
    HasUploadFilePermission,
    IsValidDownloadToken,
)
from ..serializers import (
    ConfirmChunkSerializer,
    FileSerializer,
    InitUploadSerializer,
    SharedFileSerializer,
)


class FileViewSet(ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [HasManageFilePermission]

    def get_permissions(self):
        if self.action in ("init_upload", "confirm_chunk"):
            self.permission_classes = [HasUploadFilePermission]
        elif self.action == "list":
            self.permission_classes = [IsAuthenticated]

        return super().get_permissions()

    def get_queryset(self):
        drive = get_active_drive(self.request)
        return File.objects.filter(drive=drive).prefetch_related("chunks")

    def perform_destroy(self, instance):
        for chunk in instance.chunks.filter(upload_status=ChunkStatus.UPLOADED):
            try:
                connector = get_connector(chunk.storage_account)
                connector.delete_file(chunk.external_chunk_id)
            except Exception as e:
                logger.warning(
                    f"Failed to delete chunk {chunk.chunk_index} "
                    f"from {chunk.storage_account}: {e}"
                )
        instance.delete()

    @action(detail=False, methods=["post"], url_path="init-upload")
    def init_upload(self, request):
        serializer = InitUploadSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        response_data = serializer.save()

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="confirm-chunk")
    def confirm_chunk(self, request, pk=None):
        file = self.get_object()

        serializer = ConfirmChunkSerializer(
            data=request.data, context={"request": request, "file": file}
        )
        serializer.is_valid(raise_exception=True)
        response_data = serializer.save()

        return Response(response_data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[HasDownloadFilePermission],
        url_path="download-token",
    )
    def download_token(self, request, pk=None):
        file = self.get_object()

        if file.status != ChunkStatus.UPLOADED:
            return Response(
                {"error": "File upload is not complete."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            ChunkDownloader().validate_chunks(file)
        except StorageAccountDisconnectedError as e:
            logger.error(f"Download token denied — storage account disconnected: {e}")
            return Response(
                {
                    "error": "The storage account holding this file has been disconnected."
                },
                status=status.HTTP_409_CONFLICT,
            )
        except ChunkMissingError as e:
            logger.error(
                f"Download token denied — chunk missing from cloud storage: {e}"
            )
            return Response(
                {"error": "This file's data is no longer available in cloud storage."},
                status=status.HTTP_409_CONFLICT,
            )

        token = DOWNLOAD_SIGNER.sign(str(file.id))

        download_url = request.build_absolute_uri(
            f"/files/{file.id}/download/?token={token}"
        )

        return Response({"download_url": download_url})

    @action(
        detail=True,
        methods=["get"],
        authentication_classes=[],
        permission_classes=[IsValidDownloadToken],
        url_path="download",
    )
    def download(self, request, pk=None):
        file = get_object_or_404(File, id=pk)

        try:
            downloader = ChunkDownloader()
            sync_stream = downloader.stream_chunks(file)

            response = StreamingHttpResponse(
                stream_as_async(sync_stream), content_type=file.mime_type
            )
            encoded_name = quote(file.name)
            response[
                "Content-Disposition"
            ] = f"attachment; filename*=UTF-8''{encoded_name}"

            if file.file_size:
                response["Content-Length"] = file.file_size

            return response

        except StorageAccountDisconnectedError as e:
            logger.error(f"Download failed — storage account disconnected: {e}")

            return Response(
                {"error": "Storage account disconnected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ChunkMissingError as e:
            logger.error(f"Download failed — chunk missing from cloud storage: {e}")

            return Response(
                {"error": "Chunk missing from cloud storage"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.error(f"Download failed unexpectedly: {e}")

            return Response(
                {"error": "Download failed unexpectedly"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
