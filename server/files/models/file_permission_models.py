from django.conf import settings
from django.db import models

from endless_storage.models import BaseModel

from .file_models import File


class FilePermission(BaseModel):
    file = models.ForeignKey(
        File, on_delete=models.CASCADE, related_name="user_permissions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shared_files"
    )
    can_download = models.BooleanField(default=False)

    class Meta:
        unique_together = ("file", "user")
