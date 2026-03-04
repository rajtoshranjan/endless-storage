from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from drive.constants import DriveMemberRole
from drive.helpers import get_active_drive

from .models import File, FilePermission, FileShareLink


def has_file_permission(file: File, user: User):
    """
    Check if the user has permission to access the file.
    """
    if file.drive.owner == user:
        return True

    if file.drive.members.filter(user=user).exists():
        return True

    return False


def has_manage_file_permission(file: File, user: User):
    """
    Check if the user has permission to manage the file.
    """
    if file.drive.owner == user:
        return True

    if file.drive.members.filter(
        user=user, role__in=[DriveMemberRole.ADMIN.value, DriveMemberRole.REGULAR.value]
    ).exists():
        return True

    return False


class HasDownloadFilePermission(IsAuthenticated):
    def has_object_permission(self, request, view, file: File):
        if has_file_permission(file, request.user):
            return True

        file_permissions = file.user_permissions.filter(user=request.user)

        if file_permissions.exists() and file_permissions.first().can_download:
            return True

        return False


class HasUploadFilePermission(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        drive = get_active_drive(request)
        if drive.owner == request.user:
            return True

        if drive.members.filter(
            user=request.user,
            role__in=[DriveMemberRole.ADMIN.value, DriveMemberRole.REGULAR.value],
        ).exists():
            return True

        return False


class HasManageFilePermission(IsAuthenticated):
    def has_object_permission(self, request, view, file: File):
        return has_manage_file_permission(file, request.user)


# Link permissions.
class CanManageFileShareLinkPermission(IsAuthenticated):
    def has_object_permission(self, request, view, file_share_link: FileShareLink):
        return has_manage_file_permission(file_share_link.file, request.user)


# File permission.
class CanManageFileAccessPermission(IsAuthenticated):
    def has_object_permission(self, request, view, file_permission: FilePermission):
        return has_manage_file_permission(file_permission.file, request.user)
