from django.conf import settings
from django.db import models

from endless_storage.models import BaseModel
from storage.models import StorageAccount


class File(BaseModel):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_files"
    )
    drive = models.ForeignKey(
        "drive.Drive", on_delete=models.CASCADE, related_name="files"
    )
    storage_account = models.ForeignKey(
        StorageAccount,
        on_delete=models.PROTECT,
        related_name="files",
        null=True,
        blank=True,
    )
    external_file_id = models.CharField(max_length=255, default="")
    mime_type = models.CharField(max_length=127, default="application/octet-stream")
    file_size = models.BigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "owner"],
                name="unique_file_name_owner",
                violation_error_message="A file with this name already exists",
                violation_error_code="unique_file_name_owner",
            )
        ]

    @property
    def size(self):
        return self.file_size
