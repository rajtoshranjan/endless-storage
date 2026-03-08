from django.db.models import TextChoices


class ChunkStatus(TextChoices):
    PENDING = "pending"
    UPLOADED = "uploaded"
    FAILED = "failed"
