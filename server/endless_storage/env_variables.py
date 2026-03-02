import os
from enum import Enum


class EnvVariable(Enum):
    SECRET_KEY = os.environ["SECRET_KEY"]
    ALLOWED_HOSTS = os.environ["ALLOWED_HOSTS"]
    DEBUG = os.environ["DEBUG"]
    ALLOWED_CORS_DOMAINS = os.environ["ALLOWED_CORS_DOMAINS"]
    DB_NAME = os.environ["DB_NAME"]
    DB_USER = os.environ["DB_USER"]
    DB_PASSWORD = os.environ["DB_PASSWORD"]
    DB_HOST = os.environ["DB_HOST"]
    DB_PORT = os.environ["DB_PORT"]
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://localhost:5173/oauth/callback"
    )
