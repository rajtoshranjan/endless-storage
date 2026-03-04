from files.models import ChunkStatus
from storage.connectors import get_connector

from .exceptions import ChunkMissingError, StorageAccountDisconnectedError


class ChunkDownloader:
    """Streams file chunks in order from multiple storage accounts."""

    def stream_chunks(self, file):
        """
        Generator that yields chunk data in order.

        Iterates through all uploaded chunks of the file,
        streaming each chunk's content from its storage account.

        Args:
            file: File model instance with related chunks.

        Yields:
            bytes: Chunk data fragments.

        Raises:
            StorageAccountDisconnectedError: If a chunk's storage account has been disconnected.
            ChunkMissingError: If a chunk no longer exists in cloud storage.
        """
        chunks = (
            file.chunks.filter(upload_status=ChunkStatus.UPLOADED)
            .select_related("storage_account")
            .order_by("chunk_index")
        )

        for chunk in chunks:
            if not chunk.storage_account.is_active:
                raise StorageAccountDisconnectedError(
                    f"The storage account holding chunk {chunk.chunk_index} "
                    f"of '{file.name}' has been disconnected."
                )

            connector = get_connector(chunk.storage_account)
            try:
                stream, _ = connector.stream_file(chunk.external_chunk_id)
            except FileNotFoundError:
                raise ChunkMissingError(
                    f"Chunk {chunk.chunk_index} of '{file.name}' is no longer "
                    f"available in cloud storage."
                )

            for data in stream:
                yield data

    def validate_chunks(self, file) -> None:
        """
        Pre-validate that all chunks are accessible before issuing a download token.

        Raises:
            StorageAccountDisconnectedError: If a chunk's storage account is inactive.
            ChunkMissingError: If a chunk no longer exists in cloud storage.
        """
        chunks = (
            file.chunks.filter(upload_status=ChunkStatus.UPLOADED)
            .select_related("storage_account")
            .order_by("chunk_index")
        )

        for chunk in chunks:
            if not chunk.storage_account.is_active:
                raise StorageAccountDisconnectedError(
                    f"The storage account holding chunk {chunk.chunk_index} "
                    f"of '{file.name}' has been disconnected."
                )

            connector = get_connector(chunk.storage_account)
            try:
                connector.get_file_metadata(chunk.external_chunk_id)
            except FileNotFoundError:
                raise ChunkMissingError(
                    f"Chunk {chunk.chunk_index} of '{file.name}' is no longer "
                    f"available in cloud storage."
                )
