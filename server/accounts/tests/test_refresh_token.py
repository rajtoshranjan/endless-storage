from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase


class TestRefreshToken(BaseTestCase):
    def setUp(self):
        self.authenticate(self.user)

    def test_refresh_token_case_1(self):
        """
        Test refresh token endpoint with correct refresh token.
        """

        # Arrange.
        data = {
            "refresh": str(self.token),
        }

        # Act.
        response = self.client.post(reverse("token-refresh"), data)
        response_data = response.json()

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response_data["data"])

    def test_refresh_token_case_2(self):
        """
        Test refresh token endpoint with wrong refresh token.
        """

        # Arrange.
        data = {
            "refresh": "wrong-refresh-token",
        }

        # Act.
        response = self.client.post(reverse("token-refresh"), data)

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
