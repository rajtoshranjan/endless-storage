from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase

from ..models import Drive


class TestDriveEndpoints(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.user)
        self.drive = self.default_drive  # Use the default drive

        # Create additional test drive
        self.other_drive = Drive.objects.create(name="Other Drive", owner=self.user)

    def test_create_drive(self):
        """Test drive creation endpoint."""
        # Arrange
        data = {"name": "New Drive"}

        # Act
        response = self.client.post(reverse("drive-list"), data)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Drive")

    def test_list_drives(self):
        """Test drive listing endpoint."""
        # Act
        response = self.client.get(reverse("drive-list"))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_drive(self):
        """Test getting a single drive."""
        # Act
        response = self.client.get(
            reverse("drive-detail", kwargs={"pk": self.drive.id})
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.drive.id))

    def test_update_drive(self):
        """Test drive update endpoint."""
        # Arrange
        data = {"name": "Updated Drive"}

        # Act
        response = self.client.patch(
            reverse("drive-detail", kwargs={"pk": self.drive.id}), data
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Drive")

    def test_delete_drive(self):
        """Test drive deletion endpoint."""
        # Act
        response = self.client.delete(
            reverse("drive-detail", kwargs={"pk": self.drive.id})
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Drive.objects.filter(id=self.drive.id).exists())
