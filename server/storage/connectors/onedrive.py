from datetime import timedelta

import requests
from django.utils import timezone

from endless_storage.env_variables import EnvVariable

from ..constants import ENDLESS_STORAGE_FOLDER_NAME
from .base import BaseStorageConnector

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"


class OneDriveConnector(BaseStorageConnector):
    """Connector for Microsoft OneDrive using the Microsoft Graph API."""

    def _is_token_expired(self) -> bool:
        if not self.storage_account.token_expiry:
            return True
        return timezone.now() >= self.storage_account.token_expiry - timedelta(
            minutes=5
        )

    def _get_valid_token(self) -> str:
        if self._is_token_expired():
            self.refresh_credentials()
        return self.storage_account.access_token

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self._get_valid_token()}"}

    def refresh_credentials(self) -> None:
        response = requests.post(
            TOKEN_URL,
            data={
                "client_id": EnvVariable.ONEDRIVE_CLIENT_ID.value,
                "client_secret": EnvVariable.ONEDRIVE_CLIENT_SECRET.value,
                "refresh_token": self.storage_account.refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        data = response.json()

        self.storage_account.access_token = data["access_token"]
        if "refresh_token" in data:
            self.storage_account.refresh_token = data["refresh_token"]
        self.storage_account.token_expiry = timezone.now() + timedelta(
            seconds=data.get("expires_in", 3600)
        )
        self.storage_account.save(
            update_fields=["access_token", "refresh_token", "token_expiry"]
        )

    def _get_or_create_folder(self) -> str:
        """Get or create the Endless Storage folder in OneDrive root."""
        headers = self._auth_headers()

        response = requests.get(
            f"{GRAPH_BASE}/me/drive/root:/{ENDLESS_STORAGE_FOLDER_NAME}",
            headers=headers,
        )
        if response.status_code == 200:
            return response.json()["id"]

        # Folder not found — create it.
        response = requests.post(
            f"{GRAPH_BASE}/me/drive/root/children",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "name": ENDLESS_STORAGE_FOLDER_NAME,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "fail",
            },
        )
        # 409 = already exists (race condition), re-fetch.
        if response.status_code == 409:
            r = requests.get(
                f"{GRAPH_BASE}/me/drive/root:/{ENDLESS_STORAGE_FOLDER_NAME}",
                headers=self._auth_headers(),
            )
            r.raise_for_status()
            return r.json()["id"]

        response.raise_for_status()
        return response.json()["id"]

    def upload_file(self, file_name: str, file_content, mime_type: str) -> str:
        """Upload a file directly to OneDrive (for small files / server-side use)."""
        self._get_or_create_folder()
        headers = {**self._auth_headers(), "Content-Type": mime_type}

        content = file_content.read() if hasattr(file_content, "read") else file_content

        response = requests.put(
            f"{GRAPH_BASE}/me/drive/root:/{ENDLESS_STORAGE_FOLDER_NAME}/{file_name}:/content",
            headers=headers,
            data=content,
        )
        response.raise_for_status()
        return response.json()["id"]

    def get_upload_url(self, file_name: str, mime_type: str, origin: str = "") -> dict:
        """Create an upload session so the client can upload directly to OneDrive."""
        self._get_or_create_folder()
        response = requests.post(
            f"{GRAPH_BASE}/me/drive/root:/{ENDLESS_STORAGE_FOLDER_NAME}/{file_name}:/createUploadSession",
            headers={**self._auth_headers(), "Content-Type": "application/json"},
            json={"item": {"@microsoft.graph.conflictBehavior": "rename"}},
        )
        response.raise_for_status()
        return {
            "url": response.json()["uploadUrl"],
            "method": "PUT",
            "content_type": None,
            "external_id": None,
        }

    def get_file_metadata(self, external_file_id: str) -> dict:
        response = requests.get(
            f"{GRAPH_BASE}/me/drive/items/{external_file_id}",
            headers=self._auth_headers(),
        )
        if response.status_code == 404:
            raise FileNotFoundError(f"File {external_file_id} not found in OneDrive")
        response.raise_for_status()
        data = response.json()
        return {
            "id": data["id"],
            "name": data["name"],
            "size": data.get("size", 0),
            "mimeType": data.get("file", {}).get(
                "mimeType", "application/octet-stream"
            ),
        }

    def stream_file(self, external_file_id: str):
        headers = self._auth_headers()
        response = requests.get(
            f"{GRAPH_BASE}/me/drive/items/{external_file_id}/content",
            headers=headers,
            stream=True,
            allow_redirects=True,
        )

        if response.status_code == 401:
            response.close()
            self.refresh_credentials()
            response = requests.get(
                f"{GRAPH_BASE}/me/drive/items/{external_file_id}/content",
                headers=self._auth_headers(),
                stream=True,
                allow_redirects=True,
            )

        if response.status_code == 404:
            response.close()
            raise FileNotFoundError(f"File {external_file_id} not found in OneDrive")

        response.raise_for_status()
        mime_type = response.headers.get("Content-Type", "application/octet-stream")

        def chunk_generator():
            with response:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        yield chunk

        return chunk_generator(), mime_type

    def delete_file(self, external_file_id: str) -> None:
        response = requests.delete(
            f"{GRAPH_BASE}/me/drive/items/{external_file_id}",
            headers=self._auth_headers(),
        )
        # 204 = success, 404 = already gone — both are acceptable.
        if response.status_code not in (200, 204, 404):
            response.raise_for_status()

    def get_storage_quota(self) -> dict:
        response = requests.get(
            f"{GRAPH_BASE}/me/drive",
            headers=self._auth_headers(),
        )
        response.raise_for_status()
        quota = response.json().get("quota", {})
        total = quota.get("total", 0)
        used = quota.get("used", 0)
        return {
            "limit": total,
            "usage": used,
            "remaining": total - used if total > 0 else float("inf"),
        }
