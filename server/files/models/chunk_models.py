from django.db import models

from endless_storage.models import BaseModel
from storage.models import StorageAccount

from .file_models import File


class ChunkStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    UPLOADED = "uploaded", "Uploaded"
    FAILED = "failed", "Failed"


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
