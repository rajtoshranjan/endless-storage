from ..constants import StorageProvider
from .base import BaseStorageConnector
from .google_drive import GoogleDriveConnector


def get_connector(storage_account) -> BaseStorageConnector:
    """Factory function to return the correct connector for a storage account."""
    connectors = {
        StorageProvider.GOOGLE_DRIVE.value: GoogleDriveConnector,
    }

    connector_class = connectors.get(storage_account.provider)
    if not connector_class:
        raise ValueError(f"Unsupported storage provider: {storage_account.provider}")

    return connector_class(storage_account)
