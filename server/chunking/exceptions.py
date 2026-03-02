class InsufficientStorageError(Exception):
    """Total free space across all connected drives is not enough."""


class ChunkUploadError(Exception):
    """A chunk upload failed after all retries."""
