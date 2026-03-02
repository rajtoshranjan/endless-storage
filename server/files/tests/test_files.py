from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from secure_share.tests import BaseTestCase
from storage.constants import StorageProvider
from storage.models import StorageAccount

from ..models import File


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

        # Create test file record (no local file, uses external storage)
        self.file = File.objects.create(
            name="test.txt",
            owner=self.user,
            drive=self.default_drive,
            storage_account=self.storage_account,
            external_file_id="mock-external-id-123",
            mime_type="text/plain",
            file_size=17,
        )

    @patch("storage.connectors.google_drive.GoogleDriveConnector.upload_file")
    def test_upload_file(self, mock_upload):
        """Test file upload endpoint."""
        # Arrange
        mock_upload.return_value = "new-external-id-456"
        file_content = b"new file content"
        file = SimpleUploadedFile(
            "new_file.txt", file_content, content_type="text/plain"
        )
        data = {"file": file, "storage_account": str(self.storage_account.id)}

        # Act
        response = self.client.post(reverse("file-list"), data, format="multipart")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "new_file.txt")
        self.assertTrue(File.objects.filter(name="new_file.txt").exists())
        mock_upload.assert_called_once()

    def test_list_files(self):
        """Test file listing endpoint."""
        # Act
        response = self.client.get(reverse("file-list"))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "test.txt")

    @patch("storage.connectors.google_drive.GoogleDriveConnector.download_file")
    def test_download_file(self, mock_download):
        """Test file download endpoint."""
        # Arrange
        mock_download.return_value = (b"test file content", "text/plain")

        # Act
        response = self.client.get(
            reverse("file-download", kwargs={"pk": self.file.id})
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.get("Content-Disposition"),
            f'attachment; filename="{self.file.name}"',
        )
        content = b"".join(response.streaming_content)
        self.assertEqual(content, b"test file content")
        mock_download.assert_called_once_with("mock-external-id-123")

    @patch("storage.connectors.google_drive.GoogleDriveConnector.delete_file")
    def test_delete_file(self, mock_delete):
        """Test file deletion endpoint."""
        # Act
        response = self.client.delete(
            reverse("file-detail", kwargs={"pk": self.file.id})
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(File.objects.filter(id=self.file.id).exists())
        mock_delete.assert_called_once_with("mock-external-id-123")
