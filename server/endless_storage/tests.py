from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


class BaseTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        UserModel = get_user_model()
        cls.user = UserModel.objects.create_user(
            email="thisisatestemail@gmail.com",
            password="veryStrongPassword123#",
            name="Test User",
        )
        # Create a default drive for the user
        cls.default_drive = cls.user.owned_drives.first()

    def authenticate(self, user=None):
        """Authenticate user and set up token."""
        self.token = RefreshToken.for_user(user or self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token.access_token}",
            HTTP_X_ACTIVE_DRIVE_ID=str(self.default_drive.id),
        )
