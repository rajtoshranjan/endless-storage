from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase

from ..constants import DriveMemberRole
from ..models import DriveMember


class TestDriveMemberEndpoints(BaseTestCase):
    def setUp(self):
        super().setUp()
        UserModel = get_user_model()

        # Create test users
        self.admin_user = UserModel.objects.create_user(
            email="admin@test.com", password="testpass123", name="Admin User"
        )
        self.regular_user = UserModel.objects.create_user(
            email="regular@test.com", password="testpass123", name="Regular User"
        )
        self.guest_user = UserModel.objects.create_user(
            email="guest@test.com", password="testpass123", name="Guest User"
        )

        # Create test drive (use default drive from base test)
        self.drive = self.default_drive

        # Create drive members
        self.admin_member = DriveMember.objects.create(
            drive=self.drive, user=self.admin_user, role=DriveMemberRole.ADMIN.value
        )
        self.regular_member = DriveMember.objects.create(
            drive=self.drive, user=self.regular_user, role=DriveMemberRole.REGULAR.value
        )
        self.guest_member = DriveMember.objects.create(
            drive=self.drive, user=self.guest_user, role=DriveMemberRole.GUEST.value
        )

    def test_list_drive_members(self):
        """Test listing drive members."""
        # Arrange
        self.authenticate(self.user)  # Owner should see all members

        # Act
        response = self.client.get(reverse("drive-members-list"))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_add_drive_member(self):
        """Test adding a new drive member."""
        # Arrange
        self.authenticate(self.user)
        new_user = get_user_model().objects.create_user(
            email="new@test.com", password="testpass123", name="New User"
        )
        data = {
            "email": new_user.email,
            "role": DriveMemberRole.REGULAR.value,
            "drive_id": str(self.drive.id),
        }

        # Act
        response = self.client.post(reverse("drive-members-list"), data)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], DriveMemberRole.REGULAR.value)

    def test_update_drive_member_role(self):
        """Test updating a drive member's role."""
        # Arrange
        self.authenticate(self.user)
        data = {
            "role": DriveMemberRole.ADMIN.value,
            "drive": str(self.drive.id),  # Add drive ID to request
        }

        # Act
        response = self.client.patch(
            reverse("drive-members-detail", kwargs={"pk": self.regular_member.id}), data
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], DriveMemberRole.ADMIN.value)

    def test_remove_drive_member(self):
        """Test removing a drive member."""
        # Arrange
        self.authenticate(self.user)

        # Act
        response = self.client.delete(
            reverse("drive-members-detail", kwargs={"pk": self.guest_member.id})
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(DriveMember.objects.filter(id=self.guest_member.id).exists())
