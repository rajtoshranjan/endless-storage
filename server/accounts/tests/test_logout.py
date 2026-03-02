from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase


class TestLogout(BaseTestCase):
    def setUp(self):
        self.authenticate(self.user)

    def test_logout_case_1(self):
        """
        Test logout endpoint with correct refresh token.
        """

        # Arrange.
        data = {
            "refresh_token": str(self.token),
        }

        # Act.
        response = self.client.post(reverse("user-logout"), data)

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_case_2(self):
        """
        Test logout endpoint with wrong refresh token.
        """

        # Arrange.
        data = {
            "refresh_token": "wrong-refresh-token",
        }

        # Act.
        response = self.client.post(reverse("user-logout"), data)

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
