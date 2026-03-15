import json
from datetime import timedelta

import requests
from django.utils import timezone

from endless_storage.env_variables import EnvVariable

from ..constants import ENDLESS_STORAGE_FOLDER_NAME
from .base import BaseStorageConnector

API_BASE = "https://api.dropboxapi.com/2"
CONTENT_BASE = "https://content.dropboxapi.com/2"
TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
FOLDER_PATH = f"/{ENDLESS_STORAGE_FOLDER_NAME}"


class DropboxConnector(BaseStorageConnector):
    """Connector for Dropbox using the Dropbox API v2."""

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
                "refresh_token": self.storage_account.refresh_token,
                "grant_type": "refresh_token",
                "client_id": EnvVariable.DROPBOX_CLIENT_ID.value,
                "client_secret": EnvVariable.DROPBOX_CLIENT_SECRET.value,
            },
        )
        response.raise_for_status()
        data = response.json()

        self.storage_account.access_token = data["access_token"]
        self.storage_account.token_expiry = timezone.now() + timedelta(
            seconds=data.get("expires_in", 14400)
        )
        self.storage_account.save(update_fields=["access_token", "token_expiry"])

    def _ensure_folder_exists(self) -> None:
        """Create the Endless Storage folder if it does not exist."""
        response = requests.post(
            f"{API_BASE}/files/create_folder_v2",
            headers={**self._auth_headers(), "Content-Type": "application/json"},
            json={"path": FOLDER_PATH, "autorename": False},
        )
        if response.status_code == 200:
            return

        # 409 with a folder conflict means the folder already exists — that's fine.
        if response.status_code == 409:
            error_tag = response.json().get("error", {}).get("path", {}).get(".tag", "")
            if error_tag == "conflict":
                return

        response.raise_for_status()

    def upload_file(self, file_name: str, file_content, mime_type: str) -> str:
        """Upload a file directly to Dropbox (for server-side / small file use)."""
        self._ensure_folder_exists()
        content = file_content.read() if hasattr(file_content, "read") else file_content

        response = requests.post(
            f"{CONTENT_BASE}/files/upload",
            headers={
                **self._auth_headers(),
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": json.dumps(
                    {
                        "path": f"{FOLDER_PATH}/{file_name}",
                        "mode": "add",
                        "autorename": True,
                    }
                ),
            },
            data=content,
        )
        response.raise_for_status()
        return response.json()["id"]

    def get_upload_url(self, file_name: str, mime_type: str, origin: str = "") -> str:
        """Get a temporary upload link so the client can upload directly to Dropbox."""
        self._ensure_folder_exists()
        response = requests.post(
            f"{API_BASE}/files/get_temporary_upload_link",
            headers={**self._auth_headers(), "Content-Type": "application/json"},
            json={
                "commit_info": {
                    "path": f"{FOLDER_PATH}/{file_name}",
                    "mode": "add",
                    "autorename": True,
                },
                "duration": 14400.0,
            },
        )
        response.raise_for_status()
        return response.json()["link"]

    def get_file_metadata(self, external_file_id: str) -> dict:
        """
        Fetch metadata for a file by its Dropbox ID (format: "id:xxxxx").
        Raises FileNotFoundError if the file no longer exists.
        """
        response = requests.post(
            f"{API_BASE}/files/get_metadata",
            headers={**self._auth_headers(), "Content-Type": "application/json"},
            json={"path": external_file_id},
        )
        if response.status_code == 409:
            raise FileNotFoundError(f"File {external_file_id} not found in Dropbox")
        response.raise_for_status()
        data = response.json()
        return {
            "id": data["id"],
            "name": data["name"],
            "size": data.get("size", 0),
            "mimeType": "application/octet-stream",
        }

    def stream_file(self, external_file_id: str):
        """
        Stream a file from Dropbox in 1 MB chunks.
        Dropbox IDs ("id:xxxx") are accepted by the path parameter.
        """
        headers = {
            **self._auth_headers(),
            "Dropbox-API-Arg": json.dumps({"path": external_file_id}),
        }
        response = requests.post(
            f"{CONTENT_BASE}/files/download",
            headers=headers,
            stream=True,
        )

        if response.status_code == 401:
            response.close()
            self.refresh_credentials()
            headers["Authorization"] = f"Bearer {self.storage_account.access_token}"
            response = requests.post(
                f"{CONTENT_BASE}/files/download",
                headers=headers,
                stream=True,
            )

        if response.status_code == 409:
            response.close()
            raise FileNotFoundError(f"File {external_file_id} not found in Dropbox")

        response.raise_for_status()

        def chunk_generator():
            with response:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        yield chunk

        return chunk_generator(), "application/octet-stream"

    def delete_file(self, external_file_id: str) -> None:
        response = requests.post(
            f"{API_BASE}/files/delete_v2",
            headers={**self._auth_headers(), "Content-Type": "application/json"},
            json={"path": external_file_id},
        )
        # 409 path/not_found is acceptable — file is already gone.
        if response.status_code == 409:
            return
        response.raise_for_status()

    def get_storage_quota(self) -> dict:
        response = requests.post(
            f"{API_BASE}/users/get_space_usage",
            headers=self._auth_headers(),
        )
        response.raise_for_status()
        data = response.json()
        used = data.get("used", 0)
        total = data.get("allocation", {}).get("allocated", 0)
        return {
            "limit": total,
            "usage": used,
            "remaining": total - used if total > 0 else float("inf"),
        }
