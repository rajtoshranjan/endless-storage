from django.core.signing import TimestampSigner
from django.db.models import TextChoices


class ChunkStatus(TextChoices):
    PENDING = "pending"
    UPLOADED = "uploaded"
    FAILED = "failed"


DOWNLOAD_TOKEN_MAX_AGE = 60  # seconds
DOWNLOAD_SIGNER = TimestampSigner(salt="file-download")
