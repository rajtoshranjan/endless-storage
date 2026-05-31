from ..constants import StorageProvider
from .base import BaseStorageConnector
from .dropbox_connector import DropboxConnector
from .google_drive import GoogleDriveConnector
from .onedrive import OneDriveConnector


def get_connector(storage_account) -> BaseStorageConnector:
    """Factory function to return the correct connector for a storage account."""
    connectors = {
        StorageProvider.GOOGLE_DRIVE.value: GoogleDriveConnector,
        StorageProvider.ONEDRIVE.value: OneDriveConnector,
        StorageProvider.DROPBOX.value: DropboxConnector,
    }

    connector_class = connectors.get(storage_account.provider)
    if not connector_class:
        raise ValueError(f"Unsupported storage provider: {storage_account.provider}")

    return connector_class(storage_account)
