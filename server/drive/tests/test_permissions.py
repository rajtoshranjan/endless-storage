from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from drive.constants import DriveMemberRole
from drive.models import DriveMember
from endless_storage.tests import BaseTestCase


class DrivePermissionsTestBase(BaseTestCase):
    def setUp(self):
        super().setUp()
        UserModel = get_user_model()

        # Create test users with different roles
        self.admin_user = UserModel.objects.create_user(
            email="admin@test.com", password="testpass123", name="Admin User"
        )
        self.regular_user = UserModel.objects.create_user(
            email="regular@test.com", password="testpass123", name="Regular User"
        )
        self.guest_user = UserModel.objects.create_user(
            email="guest@test.com", password="testpass123", name="Guest User"
        )
        self.non_member = UserModel.objects.create_user(
            email="nonmember@test.com", password="testpass123", name="Non Member"
        )

        # Use default drive from base test
        self.drive = self.default_drive

        # Add members with different roles
        self.admin_member = DriveMember.objects.create(
            drive=self.drive, user=self.admin_user, role=DriveMemberRole.ADMIN.value
        )
        self.regular_member = DriveMember.objects.create(
            drive=self.drive, user=self.regular_user, role=DriveMemberRole.REGULAR.value
        )
        self.guest_member = DriveMember.objects.create(
            drive=self.drive, user=self.guest_user, role=DriveMemberRole.GUEST.value
        )


class TestOwnerPermissions(DrivePermissionsTestBase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.user)

    def test_can_manage_members(self):
        """Test owner can add members"""
        response = self.client.post(
            reverse("drive-members-list"),
            {
                "email": self.non_member.email,
                "role": DriveMemberRole.REGULAR.value,
                "drive_id": str(self.drive.id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class TestAdminPermissions(DrivePermissionsTestBase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.admin_user)

    def test_can_manage_members(self):
        """Test admin can add members"""
        response = self.client.post(
            reverse("drive-members-list"),
            {
                "email": self.non_member.email,
                "role": DriveMemberRole.REGULAR.value,
                "drive_id": str(self.drive.id),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_manage_drive(self):
        """Test admin cannot update or delete drive"""
        # Update drive
        response = self.client.patch(
            reverse("drive-detail", kwargs={"pk": self.drive.id}),
            {"name": "Updated Drive"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete drive
        response = self.client.delete(
            reverse("drive-detail", kwargs={"pk": self.drive.id})
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TestRegularMemberPermissions(DrivePermissionsTestBase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.regular_user)

    def test_restricted_permissions(self):
        """Test regular member restrictions"""
        # Cannot add members
        response = self.client.post(
            reverse("drive-members-list"),
            {"email": self.non_member.email, "role": DriveMemberRole.REGULAR.value},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot update drive
        response = self.client.patch(
            reverse("drive-detail", kwargs={"pk": self.drive.id}),
            {"name": "Updated Drive"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TestGuestAndNonMemberPermissions(DrivePermissionsTestBase):
    def test_guest_restrictions(self):
        """Test guest member restrictions"""
        self.authenticate(self.guest_user)

        # Cannot add members
        response = self.client.post(
            reverse("drive-members-list"),
            {"email": self.non_member.email, "role": DriveMemberRole.REGULAR.value},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot update members
        response = self.client.patch(
            reverse("drive-members-detail", kwargs={"pk": self.regular_member.id}),
            {"role": DriveMemberRole.ADMIN.value},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_restrictions(self):
        """Test non-member restrictions"""
        self.authenticate(self.non_member)

        # Cannot view drive
        response = self.client.get(
            reverse("drive-detail", kwargs={"pk": self.drive.id})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot view members
        response = self.client.get(reverse("drive-members-list"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
