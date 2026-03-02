from django.urls import reverse
from rest_framework import status

from endless_storage.tests import BaseTestCase


class TestLogin(BaseTestCase):
    def test_login_case_1(self):
        """
        Testing login endpoint with correct credentials.
        """

        # Arrange.
        data = {
            "username": self.user.email,
            "password": "veryStrongPassword123#",
        }

        # Act.
        response = self.client.post(reverse("generate-code-jwt"), data)

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.json()["data"]["access"])
        self.assertIsNotNone(response.json()["data"]["refresh"])

    def test_login_case_2(self):
        """
        Testing login with incorrect credentials.
        """

        # Arrange.
        data = {
            "username": "incorrect@email.com",
            "password": "incorrect-password",
        }

        # Act.
        response = self.client.post(reverse("generate-code-jwt"), data)

        # Assert.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
