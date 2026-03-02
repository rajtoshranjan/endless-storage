import logging

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from drive.helpers import get_active_drive
from storage.connectors import get_connector

from ..helpers import select_storage_account
from ..models import File, FilePermission
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
        if self.action in ("create", "init_upload", "confirm_upload"):
            self.permission_classes = [HasUploadFilePermission]
        elif self.action == "list":
            self.permission_classes = [IsAuthenticated]
        elif self.action == "download" and "token" in self.request.query_params:
            from rest_framework.permissions import AllowAny

            self.permission_classes = [AllowAny]

        return super().get_permissions()

    def get_queryset(self):
        drive = get_active_drive(self.request)
        return File.objects.filter(drive=drive)

    @action(detail=False, methods=["post"], url_path="init-upload")
    def init_upload(self, request):
        """
        Initiate a resumable upload session.
        Creates a pending File record and returns the upload URL + file ID.
        """
        file_name = request.data.get("file_name")
        file_size = int(request.data.get("file_size", 0))
        mime_type = request.data.get("mime_type", "application/octet-stream")

        if not file_name:
            return Response(
                {"error": "file_name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            storage_account = select_storage_account(request.user, file_size)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drive = get_active_drive(request)

        # Create the file record now (pending upload)
        file = File.objects.create(
            name=file_name,
            owner=request.user,
            drive=drive,
            storage_account=storage_account,
            mime_type=mime_type,
            file_size=file_size,
        )

        connector = get_connector(storage_account)
        origin = request.META.get("HTTP_ORIGIN", request.META.get("HTTP_REFERER", ""))
        upload_url = connector.create_resumable_upload(file_name, mime_type, origin=origin)

        return Response(
            {
                "upload_url": upload_url,
                "file_id": str(file.id),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="confirm-upload")
    def confirm_upload(self, request):
        """
        Confirm a direct upload has completed.
        Updates the pending File record with the external file ID.
        """
        file_id = request.data.get("file_id")
        external_file_id = request.data.get("external_file_id")

        if not file_id or not external_file_id:
            return Response(
                {"error": "file_id and external_file_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            file = File.objects.get(id=file_id, owner=request.user)
        except File.DoesNotExist:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Fetch actual metadata from Google Drive
        connector = get_connector(file.storage_account)
        metadata = connector.get_file_metadata(external_file_id)

        file.external_file_id = external_file_id
        file.mime_type = metadata.get("mimeType", file.mime_type)
        file.file_size = int(metadata.get("size", file.file_size))
        file.save(update_fields=["external_file_id", "mime_type", "file_size"])

        serializer = FileSerializer(file, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        """Fallback server-proxied upload (kept for compatibility)."""
        uploaded_file = serializer.validated_data.pop("file", None)
        if not uploaded_file:
            raise ValueError("No file provided for upload")

        storage_account = select_storage_account(
            self.request.user, uploaded_file.size
        )
        connector = get_connector(storage_account)

        mime_type = uploaded_file.content_type or "application/octet-stream"

        external_file_id = connector.upload_file(
            file_name=uploaded_file.name,
            file_content=uploaded_file,
            mime_type=mime_type,
        )

        serializer.save(
            owner=self.request.user,
            storage_account=storage_account,
            external_file_id=external_file_id,
            mime_type=mime_type,
            file_size=uploaded_file.size,
        )

    def perform_destroy(self, instance):
        """Delete the file from cloud storage and then from the database."""
        try:
            connector = get_connector(instance.storage_account)
            connector.delete_file(instance.external_file_id)
        except Exception as e:
            logger.warning(
                f"Failed to delete file from cloud storage: {e}. "
                f"Proceeding with database deletion."
            )
        instance.delete()

    @action(detail=True, methods=["get"], permission_classes=[HasDownloadFilePermission])
    def generate_download_token(self, request, pk=None):
        """Generates a short-lived token for direct browser downloads."""
        file = get_object_or_404(File, id=pk)
        self.check_object_permissions(request, file)

        from django.core import signing

        token = signing.dumps({"file_id": str(file.id)})
        return Response({"token": token})

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        token = request.query_params.get("token")
        
        if token:
            from django.core import signing

            try:
                # Token valid for 60 seconds
                data = signing.loads(token, max_age=60)
                if str(data.get("file_id")) != str(pk):
                    return Response({"error": "Invalid token payload"}, status=status.HTTP_403_FORBIDDEN)
            except signing.SignatureExpired:
                return Response({"error": "Download token expired"}, status=status.HTTP_403_FORBIDDEN)
            except signing.BadSignature:
                return Response({"error": "Invalid download token"}, status=status.HTTP_403_FORBIDDEN)
            
            file = get_object_or_404(File, id=pk)
        else:
            file = get_object_or_404(File, id=pk)
            # Fallback to standard token auth if using Axios
            if not request.user.is_authenticated:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            self.check_object_permissions(request, file)

        connector = get_connector(file.storage_account)
        stream, mime_type = connector.stream_file(file.external_file_id)

        response = StreamingHttpResponse(stream, content_type=mime_type)
        response["Content-Disposition"] = f'attachment; filename="{file.name}"'
        return response

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
