from abc import ABC, abstractmethod


class BaseStorageConnector(ABC):
    """Abstract base class for cloud storage connectors."""

    def __init__(self, storage_account):
        self.storage_account = storage_account

    @abstractmethod
    def upload_file(self, file_name: str, file_content, mime_type: str) -> str:
        """
        Upload a file to the cloud storage.

        Args:
            file_name: Name of the file.
            file_content: File-like object with the content.
            mime_type: MIME type of the file.

        Returns:
            The external file ID in the storage provider.
        """

    @abstractmethod
    def get_upload_url(self, file_name: str, mime_type: str, origin: str = "") -> str:
        """
        Return a URL the client can use to upload a file directly to the storage provider.

        Args:
            file_name: Name of the file.
            mime_type: MIME type of the file.
            origin: The request origin for CORS (used by providers that require it).

        Returns:
            The direct upload URL.
        """

    @abstractmethod
    def get_file_metadata(self, external_file_id: str) -> dict:
        """
        Get metadata for a specific file.

        Args:
            external_file_id: The file's ID in the storage provider.

        Returns:
            Dict containing metadata (e.g., 'id', 'name', 'mimeType', 'size').
        """

    @abstractmethod
    def stream_file(self, external_file_id: str):
        """
        Stream a file's content in chunks.

        Args:
            external_file_id: The file's ID in the storage provider.

        Returns:
            Tuple of (generator_yielding_chunks, mime_type).
        """

    @abstractmethod
    def delete_file(self, external_file_id: str) -> None:
        """
        Delete a file from the cloud storage.

        Args:
            external_file_id: The file's ID in the storage provider.
        """

    @abstractmethod
    def refresh_credentials(self) -> None:
        """
        Refresh the OAuth credentials if they are expired.
        Updates the storage_account model with new tokens.
        """

    @abstractmethod
    def get_storage_quota(self) -> dict:
        """
        Get storage quota information.

        Returns:
            Dict with 'limit', 'usage', and 'remaining' in bytes.
        """
