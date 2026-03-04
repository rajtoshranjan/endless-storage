from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from endless_storage.env_variables import EnvVariable

from .constants import StorageProvider
from .models import StorageAccount

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def _build_google_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": EnvVariable.GOOGLE_CLIENT_ID.value,
                "client_secret": EnvVariable.GOOGLE_CLIENT_SECRET.value,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GOOGLE_SCOPES,
        redirect_uri=EnvVariable.GOOGLE_REDIRECT_URI.value,
    )


def get_google_oauth_url() -> tuple[str, str]:
    """
    Generate a Google OAuth2 authorization URL.

    Returns:
        Tuple of (authorization_url, state).
    """
    flow = _build_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return authorization_url, state


def connect_google_drive(user, code: str) -> tuple[StorageAccount, bool]:
    """
    Exchange an authorization code for tokens and upsert a StorageAccount.

    Args:
        user: The authenticated Django user.
        code: The OAuth2 authorization code from Google.

    Returns:
        Tuple of (storage_account, created).

    Raises:
        Exception: If token exchange or ID token verification fails.
    """
    flow = _build_google_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    id_info = id_token.verify_oauth2_token(
        credentials.id_token,
        google_requests.Request(),
        EnvVariable.GOOGLE_CLIENT_ID.value,
    )
    provider_email = id_info.get("email", "")

    storage_account, created = StorageAccount.objects.update_or_create(
        user=user,
        provider=StorageProvider.GOOGLE_DRIVE.value,
        provider_email=provider_email,
        defaults={
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token or "",
            "token_expiry": credentials.expiry,
            "is_active": True,
        },
    )
    return storage_account, created
