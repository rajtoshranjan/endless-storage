from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from drive.constants import DriveMemberRole

from ..models import FilePermission
from ..permissions import CanManageFileAccessPermission, has_manage_file_permission
from ..serializers import FilePermissionSerializer


class FilePermissionViewSet(ModelViewSet):
    serializer_class = FilePermissionSerializer
    permission_classes = [CanManageFileAccessPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["file"]

    def get_queryset(self):
        return FilePermission.objects.filter(
            Q(file__drive__owner=self.request.user)
            | (
                Q(file__drive__members__user=self.request.user)
                & Q(
                    file__drive__members__role__in=[
                        DriveMemberRole.ADMIN.value,
                        DriveMemberRole.REGULAR.value,
                    ]
                )
            ),
        )

    def perform_create(self, serializer):
        # Ensure user owns the file being shared.
        file = serializer.validated_data["file"]
        if not has_manage_file_permission(file, self.request.user):
            raise PermissionDenied("You don't have permission to share this file")
        serializer.save()

    def partial_update(self, request, pk=None):
        file_permission = self.get_object()
        file_permission.can_download = request.data.get(
            "can_download", file_permission.can_download
        )
        file_permission.save(update_fields=["can_download"])
        serializer = self.get_serializer(file_permission)
        return Response(serializer.data)
