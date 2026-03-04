class InsufficientStorageError(Exception):
    """Total free space across all connected drives is not enough."""


class ChunkUploadError(Exception):
    """A chunk upload failed after all retries."""


class ChunkMissingError(Exception):
    """A chunk is no longer present in cloud storage (deleted externally)."""


class StorageAccountDisconnectedError(Exception):
    """The storage account that holds a chunk has been disconnected."""
