from django.conf import settings
from django.db import models

from endless_storage.models import BaseModel


class File(BaseModel):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_files"
    )
    drive = models.ForeignKey(
        "drive.Drive", on_delete=models.CASCADE, related_name="files"
    )
    mime_type = models.CharField(max_length=127, default="application/octet-stream")
    file_size = models.BigIntegerField(default=0)
    total_chunks = models.PositiveIntegerField(default=0)

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
