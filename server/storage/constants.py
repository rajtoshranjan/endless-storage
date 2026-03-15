from enum import Enum

ENDLESS_STORAGE_FOLDER_NAME = "Endless Storage"


class StorageProvider(Enum):
    GOOGLE_DRIVE = "google_drive"
    ONEDRIVE = "onedrive"
    DROPBOX = "dropbox"

    @classmethod
    def choices(cls):
        return [(key.value, key.name) for key in cls]
