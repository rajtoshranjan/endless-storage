from files.models import ChunkStatus
from storage.connectors import get_connector


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
        """
        chunks = (
            file.chunks.filter(upload_status=ChunkStatus.UPLOADED)
            .select_related("storage_account")
            .order_by("chunk_index")
        )

        for chunk in chunks:
            connector = get_connector(chunk.storage_account)
            stream, _ = connector.stream_file(chunk.external_chunk_id)

            for data in stream:
                yield data
