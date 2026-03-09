from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from drive.helpers import get_active_drive

from ..models import Folder
from ..serializers import (
    FolderCreateSerializer,
    FolderMoveSerializer,
    FolderRenameSerializer,
    FolderSerializer,
)


class FolderViewSet(GenericViewSet):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        drive = get_active_drive(self.request)
        return Folder.objects.filter(drive=drive)

    def list(self, request):
        qs = self.get_queryset()
        parent_id = request.query_params.get("parent_id")
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        else:
            qs = qs.filter(parent__isnull=True)
        serializer = FolderSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = FolderCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        folder = serializer.save()
        return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        folder = self.get_object()
        serializer = FolderRenameSerializer(
            folder, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        folder = serializer.save()
        return Response(FolderSerializer(folder).data)

    def destroy(self, request, pk=None):
        folder = self.get_object()
        if folder.has_contents():
            return Response(
                {"error": "Cannot delete a folder that contains files or subfolders."},
                status=status.HTTP_409_CONFLICT,
            )
        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def path(self, request, pk=None):
        """Return the ancestor chain from root to this folder (inclusive)."""
        folder = self.get_object()
        ancestors = []
        current = folder
        while current is not None:
            ancestors.insert(0, {"id": str(current.id), "name": current.name})
            current = current.parent
        return Response(ancestors)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        folder = self.get_object()
        serializer = FolderMoveSerializer(
            folder,
            data=request.data,
            context={"request": request, "folder": folder},
        )
        serializer.is_valid(raise_exception=True)
        folder = serializer.save()
        return Response(FolderSerializer(folder).data)
