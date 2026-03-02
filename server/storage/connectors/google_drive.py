import io
import logging

from django.utils import timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from endless_storage.env_variables import EnvVariable
from .base import BaseStorageConnector

logger = logging.getLogger(__name__)

ENDLESS_STORAGE_FOLDER_NAME = "Endless Storage"


class GoogleDriveConnector(BaseStorageConnector):
    """Connector for Google Drive storage using Google Drive API v3."""

    SCOPES = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
    ]

    def __init__(self, storage_account):
        super().__init__(storage_account)
        self._service = None

    def _get_credentials(self) -> Credentials:
        """Build Google OAuth2 credentials from stored tokens."""
        creds = Credentials(
            token=self.storage_account.access_token,
            refresh_token=self.storage_account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._get_client_id(),
            client_secret=self._get_client_secret(),
        )

        if creds.expired or not creds.valid:
            self.refresh_credentials()
            creds = Credentials(
                token=self.storage_account.access_token,
                refresh_token=self.storage_account.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self._get_client_id(),
                client_secret=self._get_client_secret(),
            )

        return creds

    def _get_client_id(self):

        return EnvVariable.GOOGLE_CLIENT_ID.value

    def _get_client_secret(self):

        return EnvVariable.GOOGLE_CLIENT_SECRET.value

    def _get_service(self):
        """Get or create Google Drive API service."""
        if self._service is None:
            creds = self._get_credentials()
            self._service = build("drive", "v3", credentials=creds)
        return self._service

    def _get_or_create_folder(self) -> str:
        """Get or create the Endless Storage folder in the user's Drive."""
        service = self._get_service()

        # Search for existing folder
        query = (
            f"name = '{ENDLESS_STORAGE_FOLDER_NAME}' "
            f"and mimeType = 'application/vnd.google-apps.folder' "
            f"and trashed = false"
        )
        results = (
            service.files()
            .list(q=query, spaces="drive", fields="files(id, name)")
            .execute()
        )
        files = results.get("files", [])

        if files:
            return files[0]["id"]

        # Create folder
        folder_metadata = {
            "name": ENDLESS_STORAGE_FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
        }
        folder = service.files().create(body=folder_metadata, fields="id").execute()
        return folder["id"]

    def upload_file(self, file_name: str, file_content, mime_type: str) -> str:
        """Upload a file to Google Drive inside the Endless Storage folder."""
        service = self._get_service()
        folder_id = self._get_or_create_folder()

        file_metadata = {
            "name": file_name,
            "parents": [folder_id],
        }

        # Read file content into bytes if it's a file-like object
        if hasattr(file_content, "read"):
            content = file_content.read()
        else:
            content = file_content

        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=mime_type,
            resumable=True,
        )

        file = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id")
            .execute()
        )

        return file["id"]

    def create_resumable_upload(
        self, file_name: str, mime_type: str, origin: str = ""
    ) -> str:
        """
        Initiate a resumable upload session with Google Drive.

        Returns the resumable upload URI that the client can use to upload
        the file directly to Google Drive.

        The `origin` header is required so Google sets CORS headers on the
        resumable upload URI, allowing direct browser uploads.
        """
        import json

        import google_auth_httplib2

        creds = self._get_credentials()
        folder_id = self._get_or_create_folder()

        file_metadata = {
            "name": file_name,
            "parents": [folder_id],
        }

        headers = {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": mime_type,
        }

        if origin:
            headers["Origin"] = origin

        http = google_auth_httplib2.AuthorizedHttp(creds)
        response, _ = http.request(
            "https://www.googleapis.com/upload/drive/v3/files"
            "?uploadType=resumable&fields=id",
            method="POST",
            body=json.dumps(file_metadata),
            headers=headers,
        )

        if response.status not in (200, 201):
            raise Exception(f"Failed to initiate resumable upload: {response.status}")

        return response["location"]

    def get_file_metadata(self, external_file_id: str) -> dict:
        """Get file metadata (name, size, mimeType) from Google Drive."""
        service = self._get_service()
        return (
            service.files()
            .get(fileId=external_file_id, fields="id,name,size,mimeType")
            .execute()
        )

    def stream_file(self, external_file_id: str):
        """
        Stream a file from Google Drive in chunks.
        Returns (chunk_iterator, mime_type).
        """
        service = self._get_service()

        # Get mime type
        file_metadata = (
            service.files().get(fileId=external_file_id, fields="mimeType").execute()
        )
        mime_type = file_metadata.get("mimeType", "application/octet-stream")

        async def chunk_generator():
            import aiohttp

            download_url = f"https://www.googleapis.com/drive/v3/files/{external_file_id}?alt=media"
            headers = {"Authorization": f"Bearer {self.storage_account.access_token}"}

            async with aiohttp.ClientSession() as session:
                async with session.get(download_url, headers=headers) as response:
                    # If token is expired, refresh and try again
                    if response.status == 401:
                        # refresh_credentials uses synchronous code, run it blockingly or just call it
                        self.refresh_credentials()
                        headers["Authorization"] = (
                            f"Bearer {self.storage_account.access_token}"
                        )

                        # Try again with new token
                        async with session.get(
                            download_url, headers=headers
                        ) as retried_response:
                            retried_response.raise_for_status()
                            async for chunk in retried_response.content.iter_chunked(
                                1024 * 1024
                            ):
                                if chunk:
                                    yield chunk
                    else:
                        response.raise_for_status()
                        async for chunk in response.content.iter_chunked(1024 * 1024):
                            if chunk:
                                yield chunk

        return chunk_generator(), mime_type

    def delete_file(self, external_file_id: str) -> None:
        """Delete a file from Google Drive."""
        service = self._get_service()
        service.files().delete(fileId=external_file_id).execute()

    def refresh_credentials(self) -> None:
        """Refresh Google OAuth2 credentials."""
        creds = Credentials(
            token=self.storage_account.access_token,
            refresh_token=self.storage_account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._get_client_id(),
            client_secret=self._get_client_secret(),
        )

        creds.refresh(Request())

        # Update stored tokens
        self.storage_account.access_token = creds.token
        self.storage_account.token_expiry = timezone.now() + timezone.timedelta(
            seconds=3600
        )
        self.storage_account.save(update_fields=["access_token", "token_expiry"])

    def get_storage_quota(self) -> dict:
        """Get Google Drive storage quota using the About API."""
        service = self._get_service()
        about = service.about().get(fields="storageQuota").execute()
        quota = about.get("storageQuota", {})

        limit = int(quota.get("limit", 0))
        usage = int(quota.get("usage", 0))

        return {
            "limit": limit,
            "usage": usage,
            "remaining": limit - usage if limit > 0 else float("inf"),
        }
