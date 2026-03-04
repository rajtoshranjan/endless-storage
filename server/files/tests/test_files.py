from unittest.mock import patch

from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase
from storage.constants import StorageProvider
from storage.models import StorageAccount

from ..models import File, FileChunk


class TestFileEndpoints(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.user)

        # Create a storage account for the user
        self.storage_account = StorageAccount.objects.create(
            user=self.user,
            provider=StorageProvider.GOOGLE_DRIVE.value,
            provider_email="test@gmail.com",
            access_token="mock-access-token",
            refresh_token="mock-refresh-token",
            is_active=True,
        )

        # Create test file record with a single chunk (V2 model)
        self.file = File.objects.create(
            name="test.txt",
            owner=self.user,
            drive=self.default_drive,
            mime_type="text/plain",
            file_size=17,
            total_chunks=1,
        )

        # Create the chunk record
        self.chunk = FileChunk.objects.create(
            file=self.file,
            chunk_index=0,
            storage_account=self.storage_account,
            external_chunk_id="mock-external-id-123",
            chunk_size=17,
            upload_status="uploaded",
        )

    @patch("storage.connectors.google_drive.GoogleDriveConnector.get_storage_quota")
    @patch(
        "storage.connectors.google_drive.GoogleDriveConnector.get_upload_url"
    )
    def test_init_upload(self, mock_upload_url, mock_quota):
        """Test init-upload returns chunk plan with upload URLs."""
        mock_quota.return_value = {
            "limit": 15_000_000_000,
            "usage": 0,
            "remaining": 15_000_000_000,
        }
        mock_upload_url.return_value = "https://upload.example.com/upload-url"

        response = self.client.post(
            reverse("file-init-upload"),
            {
                "file_name": "new_file.txt",
                "file_size": 1024,
                "mime_type": "text/plain",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file_id", response.data)
        self.assertIn("chunks", response.data)
        self.assertEqual(len(response.data["chunks"]), 1)
        self.assertEqual(response.data["chunks"][0]["chunk_index"], 0)
        self.assertEqual(response.data["chunks"][0]["chunk_size"], 1024)
        self.assertIn("upload_url", response.data["chunks"][0])

        # Verify File and FileChunk records were created
        file = File.objects.get(id=response.data["file_id"])
        self.assertEqual(file.total_chunks, 1)
        self.assertEqual(file.chunks.count(), 1)

    @patch("storage.connectors.google_drive.GoogleDriveConnector.get_file_metadata")
    def test_confirm_chunk(self, mock_metadata):
        """Test confirming a chunk upload."""
        # Create a file with a pending chunk
        file = File.objects.create(
            name="pending.txt",
            owner=self.user,
            drive=self.default_drive,
            mime_type="text/plain",
            file_size=100,
            total_chunks=1,
        )
        chunk = FileChunk.objects.create(
            file=file,
            chunk_index=0,
            storage_account=self.storage_account,
            chunk_size=100,
            upload_status="pending",
        )

        mock_metadata.return_value = {"size": "100", "mimeType": "text/plain"}

        response = self.client.post(
            reverse("file-confirm-chunk", kwargs={"pk": file.id}),
            {
                "chunk_index": 0,
                "external_chunk_id": "new-external-id-456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["all_chunks_uploaded"])

        # Verify chunk was updated
        chunk.refresh_from_db()
        self.assertEqual(chunk.external_chunk_id, "new-external-id-456")
        self.assertEqual(chunk.upload_status, "uploaded")

    def test_list_files(self):
        """Test file listing endpoint."""
        response = self.client.get(reverse("file-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "test.txt")
        self.assertEqual(response.data[0]["total_chunks"], 1)

    @patch("storage.connectors.google_drive.GoogleDriveConnector.delete_file")
    def test_delete_file(self, mock_delete):
        """Test file deletion deletes all chunks from cloud storage."""
        response = self.client.delete(
            reverse("file-detail", kwargs={"pk": self.file.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(File.objects.filter(id=self.file.id).exists())
        self.assertFalse(FileChunk.objects.filter(file=self.file).exists())
        mock_delete.assert_called_once_with("mock-external-id-123")

    @patch("storage.connectors.google_drive.GoogleDriveConnector.get_storage_quota")
    @patch(
        "storage.connectors.google_drive.GoogleDriveConnector.get_upload_url"
    )
    def test_init_upload_multi_chunk(self, mock_upload_url, mock_quota):
        """Test init-upload distributes across multiple drives."""
        # Create a second storage account
        storage_account_2 = StorageAccount.objects.create(
            user=self.user,
            provider=StorageProvider.GOOGLE_DRIVE.value,
            provider_email="test2@gmail.com",
            access_token="mock-access-token-2",
            refresh_token="mock-refresh-token-2",
            is_active=True,
        )

        # Drive 1 has 5GB, Drive 2 has 10GB
        mock_quota.side_effect = [
            {
                "limit": 15_000_000_000,
                "usage": 10_000_000_000,
                "remaining": 5_000_000_000,
            },
            {
                "limit": 15_000_000_000,
                "usage": 5_000_000_000,
                "remaining": 10_000_000_000,
            },
        ]
        mock_upload_url.return_value = "https://upload.example.com/upload-url"

        # Upload a 12GB file — should need both drives
        file_size = 12_000_000_000

        response = self.client.post(
            reverse("file-init-upload"),
            {
                "file_name": "large_file.zip",
                "file_size": file_size,
                "mime_type": "application/zip",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["chunks"]), 2)

        # Verify chunks are ordered by size (biggest drive first)
        self.assertEqual(response.data["chunks"][0]["chunk_size"], 10_000_000_000)
        self.assertEqual(response.data["chunks"][1]["chunk_size"], 2_000_000_000)

    @patch("storage.connectors.google_drive.GoogleDriveConnector.get_storage_quota")
    def test_init_upload_insufficient_space(self, mock_quota):
        """Test init-upload fails gracefully when total space is not enough."""
        mock_quota.return_value = {
            "limit": 15_000_000_000,
            "usage": 15_000_000_000,
            "remaining": 0,
        }

        response = self.client.post(
            reverse("file-init-upload"),
            {
                "file_name": "huge_file.zip",
                "file_size": 100_000_000_000,
                "mime_type": "application/zip",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
