import secrets
import urllib.parse
from datetime import timedelta

import requests
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from endless_storage import logger
from endless_storage.env_variables import EnvVariable

from .connectors import get_connector
from .constants import StorageProvider
from .models import StorageAccount

# ---------------------------------------------------------------------------
# Google Drive
# ---------------------------------------------------------------------------

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def _build_google_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": EnvVariable.GOOGLE_DRIVE_CLIENT_ID.value,
                "client_secret": EnvVariable.GOOGLE_DRIVE_CLIENT_SECRET.value,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GOOGLE_SCOPES,
        redirect_uri=EnvVariable.OAUTH_REDIRECT_URI.value,
    )


def get_google_oauth_url() -> tuple[str, str]:
    """Generate a Google OAuth2 authorization URL."""
    flow = _build_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return authorization_url, state


def connect_google_drive(user, code: str) -> tuple[StorageAccount, bool]:
    """Exchange an authorization code for tokens and upsert a Google Drive StorageAccount."""
    flow = _build_google_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    id_info = id_token.verify_oauth2_token(
        credentials.id_token,
        google_requests.Request(),
        EnvVariable.GOOGLE_DRIVE_CLIENT_ID.value,
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


# ---------------------------------------------------------------------------
# OneDrive (Microsoft Graph)
# ---------------------------------------------------------------------------

ONEDRIVE_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
ONEDRIVE_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
ONEDRIVE_SCOPES = "Files.ReadWrite offline_access User.Read"
GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"


def get_onedrive_oauth_url() -> tuple[str, str]:
    """Generate a Microsoft OneDrive OAuth2 authorization URL."""
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": EnvVariable.ONEDRIVE_CLIENT_ID.value,
        "response_type": "code",
        "redirect_uri": EnvVariable.OAUTH_REDIRECT_URI.value,
        "scope": ONEDRIVE_SCOPES,
        "response_mode": "query",
        "state": state,
    }
    url = f"{ONEDRIVE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return url, state


def connect_onedrive(user, code: str) -> tuple[StorageAccount, bool]:
    """Exchange an authorization code for tokens and upsert a OneDrive StorageAccount."""
    response = requests.post(
        ONEDRIVE_TOKEN_URL,
        data={
            "client_id": EnvVariable.ONEDRIVE_CLIENT_ID.value,
            "client_secret": EnvVariable.ONEDRIVE_CLIENT_SECRET.value,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": EnvVariable.OAUTH_REDIRECT_URI.value,
        },
    )
    response.raise_for_status()
    token_data = response.json()

    user_response = requests.get(
        GRAPH_ME_URL,
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    user_response.raise_for_status()
    user_info = user_response.json()
    provider_email = user_info.get("mail") or user_info.get("userPrincipalName", "")

    storage_account, created = StorageAccount.objects.update_or_create(
        user=user,
        provider=StorageProvider.ONEDRIVE.value,
        provider_email=provider_email,
        defaults={
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "token_expiry": timezone.now()
            + timedelta(seconds=token_data.get("expires_in", 3600)),
            "is_active": True,
        },
    )
    return storage_account, created


# ---------------------------------------------------------------------------
# Dropbox
# ---------------------------------------------------------------------------

DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize"
DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
DROPBOX_ACCOUNT_URL = "https://api.dropboxapi.com/2/users/get_current_account"


def get_dropbox_oauth_url() -> tuple[str, str]:
    """Generate a Dropbox OAuth2 authorization URL."""
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": EnvVariable.DROPBOX_CLIENT_ID.value,
        "response_type": "code",
        "redirect_uri": EnvVariable.OAUTH_REDIRECT_URI.value,
        "token_access_type": "offline",
        "state": state,
    }
    url = f"{DROPBOX_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return url, state


def connect_dropbox(user, code: str) -> tuple[StorageAccount, bool]:
    """Exchange an authorization code for tokens and upsert a Dropbox StorageAccount."""
    response = requests.post(
        DROPBOX_TOKEN_URL,
        data={
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": EnvVariable.OAUTH_REDIRECT_URI.value,
        },
        auth=(
            EnvVariable.DROPBOX_CLIENT_ID.value,
            EnvVariable.DROPBOX_CLIENT_SECRET.value,
        ),
    )
    response.raise_for_status()
    token_data = response.json()

    account_response = requests.post(
        DROPBOX_ACCOUNT_URL,
        headers={
            "Authorization": f"Bearer {token_data['access_token']}",
            "Content-Type": "application/json",
        },
        data="null",
    )
    account_response.raise_for_status()
    provider_email = account_response.json().get("email", "")

    storage_account, created = StorageAccount.objects.update_or_create(
        user=user,
        provider=StorageProvider.DROPBOX.value,
        provider_email=provider_email,
        defaults={
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "token_expiry": timezone.now()
            + timedelta(seconds=token_data.get("expires_in", 14400)),
            "is_active": True,
        },
    )
    return storage_account, created


# ---------------------------------------------------------------------------
# Shared quota helper
# ---------------------------------------------------------------------------


def get_account_quotas(user) -> list[dict]:
    """
    Fetch storage quota information for all active storage accounts.

    Returns:
        List of dicts with keys:
            - "account": StorageAccount instance
            - "remaining": int (free bytes)

    Raises:
        ValueError: If no active accounts exist or none could be reached.
    """
    accounts = StorageAccount.objects.filter(user=user, is_active=True)

    if not accounts.exists():
        raise ValueError("No active storage accounts. Connect one in Settings.")

    quotas = []
    for account in accounts:
        try:
            connector = get_connector(account)
            quota = connector.get_storage_quota()
            remaining = quota.get("remaining", 0)
            quotas.append({"account": account, "remaining": remaining})
        except Exception as e:
            logger.warning(f"Failed to check quota for {account}: {e}")

    if not quotas:
        raise ValueError("Could not retrieve quota from any storage account.")

    return quotas
