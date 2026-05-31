import os
from enum import Enum


class EnvVariable(Enum):
    # Project Config Variables.
    SECRET_KEY = os.environ["SECRET_KEY"]
    ALLOWED_HOSTS = os.environ["ALLOWED_HOSTS"]
    DEBUG = os.environ["DEBUG"]
    ALLOWED_CORS_DOMAINS = os.environ["ALLOWED_CORS_DOMAINS"]
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # DB Variables.
    DB_NAME = os.environ["DB_NAME"]
    DB_USER = os.environ["DB_USER"]
    DB_PASSWORD = os.environ["DB_PASSWORD"]
    DB_HOST = os.environ["DB_HOST"]
    DB_PORT = os.environ["DB_PORT"]

    # Shared OAuth redirect URI (all providers use the same callback page).
    OAUTH_REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "")

    # Google Drive OAuth credentials.
    GOOGLE_DRIVE_CLIENT_ID = os.getenv("GOOGLE_DRIVE_CLIENT_ID", "")
    GOOGLE_DRIVE_CLIENT_SECRET = os.getenv("GOOGLE_DRIVE_CLIENT_SECRET", "")

    # OneDrive OAuth credentials.
    ONEDRIVE_CLIENT_ID = os.getenv("ONEDRIVE_CLIENT_ID", "")
    ONEDRIVE_CLIENT_SECRET = os.getenv("ONEDRIVE_CLIENT_SECRET", "")

    # Dropbox OAuth credentials.
    DROPBOX_CLIENT_ID = os.getenv("DROPBOX_CLIENT_ID", "")
    DROPBOX_CLIENT_SECRET = os.getenv("DROPBOX_CLIENT_SECRET", "")
