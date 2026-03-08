from django.conf import settings
from django.db import models

from endless_storage.models import BaseModel
from storage.models import StorageAccount

from ..constants import ChunkStatus


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


class FileChunk(BaseModel):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    storage_account = models.ForeignKey(
        StorageAccount,
        on_delete=models.PROTECT,
        related_name="chunks",
    )
    external_chunk_id = models.CharField(max_length=255, default="")
    chunk_size = models.BigIntegerField()
    upload_status = models.CharField(
        max_length=20,
        choices=ChunkStatus.choices,
        default=ChunkStatus.PENDING,
    )

    class Meta:
        ordering = ["chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["file", "chunk_index"],
                name="unique_file_chunk_index",
            )
        ]

    def __str__(self):
        return f"{self.file.name} - chunk {self.chunk_index}"
