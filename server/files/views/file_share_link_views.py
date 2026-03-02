import logging

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from drive.constants import DriveMemberRole
from storage.connectors import get_connector

from ..models import FileShareLink
from ..permissions import CanManageFileShareLinkPermission, has_manage_file_permission
from ..serializers import FileShareLinkSerializer

logger = logging.getLogger(__name__)


class FileShareLinkViewSet(ModelViewSet):
    serializer_class = FileShareLinkSerializer
    permission_classes = [CanManageFileShareLinkPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["file"]

    def get_queryset(self):
        return FileShareLink.objects.filter(
            file__drive__owner=self.request.user,
            expires_at__gte=timezone.now(),
        ) | FileShareLink.objects.filter(
            file__drive__members__user=self.request.user,
            file__drive__members__role__in=[
                DriveMemberRole.ADMIN.value,
                DriveMemberRole.REGULAR.value,
            ],
            expires_at__gte=timezone.now(),
        )

    def perform_create(self, serializer):
        # Ensure user owns the file being shared.
        file = serializer.validated_data["file"]
        if not has_manage_file_permission(file, self.request.user):
            raise PermissionDenied("You don't have permission to share this file")
        serializer.save()

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def download(self, request, pk=None):
        share_link = get_object_or_404(FileShareLink, slug=pk)

        # Check if link has expired.
        if share_link.is_expired:
            return render(request, "link_expired.html")

        file = share_link.file

        try:
            connector = get_connector(file.storage_account)
            stream, mime_type = connector.stream_file(file.external_file_id)

            response = StreamingHttpResponse(stream, content_type=mime_type)
            response["Content-Disposition"] = f'attachment; filename="{file.name}"'
            return response
        except Exception as e:
            logger.error(f"Failed to generate download URL for share link: {e}")
            return render(request, "link_expired.html")
