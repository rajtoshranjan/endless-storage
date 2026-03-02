from django.conf import settings
from django.db import models

from endless_storage.models import BaseModel

from .constants import DriveMemberRole


class Drive(BaseModel):
    name = models.CharField(max_length=50)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_drives"
    )


class DriveMember(BaseModel):
    drive = models.ForeignKey(Drive, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="drive_memberships",
    )
    role = models.CharField(
        max_length=10, choices=DriveMemberRole.choices(), default="guest"
    )

    class Meta:
        unique_together = ("drive", "user")
