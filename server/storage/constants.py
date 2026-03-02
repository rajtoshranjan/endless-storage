from enum import Enum


class StorageProvider(Enum):
    GOOGLE_DRIVE = "google_drive"
    # Future:
    # ONEDRIVE = "onedrive"
    # DROPBOX = "dropbox"

    @classmethod
    def choices(cls):
        return [(key.value, key.name) for key in cls]
