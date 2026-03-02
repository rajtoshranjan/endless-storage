from secure_share.env_variables import EnvVariable
import logging

from google_auth_oauthlib.flow import Flow
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .constants import StorageProvider
from .connectors.google_drive import GoogleDriveConnector
from .models import StorageAccount
from .serializers import StorageAccountSerializer

logger = logging.getLogger(__name__)

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


class StorageAccountViewSet(ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "delete", "post"]

    def get_queryset(self):
        return StorageAccount.objects.filter(
            user=self.request.user,
            is_active=True,
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=False, methods=["get"], url_path="google-auth-url")
    def google_auth_url(self, request):
        """Generate Google OAuth2 authorization URL."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": EnvVariable.GOOGLE_CLIENT_ID.value,
                    "client_secret": EnvVariable.GOOGLE_CLIENT_SECRET.value,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=GOOGLE_SCOPES,
            redirect_uri=EnvVariable.GOOGLE_REDIRECT_URI.value,
        )

        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )

        return Response(
            {"url": authorization_url, "state": state},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="google-callback")
    def google_callback(self, request):
        """Exchange authorization code for tokens and create StorageAccount."""
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "Authorization code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": EnvVariable.GOOGLE_CLIENT_ID.value,
                        "client_secret": EnvVariable.GOOGLE_CLIENT_SECRET.value,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                },
                scopes=GOOGLE_SCOPES,
                redirect_uri=EnvVariable.GOOGLE_REDIRECT_URI.value,
            )

            flow.fetch_token(code=code)
            credentials = flow.credentials

            # Get user's email from Google
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            id_info = id_token.verify_oauth2_token(
                credentials.id_token,
                google_requests.Request(),
                EnvVariable.GOOGLE_CLIENT_ID.value,
            )
            provider_email = id_info.get("email", "")

            # Create or update storage account
            storage_account, created = StorageAccount.objects.update_or_create(
                user=request.user,
                provider=StorageProvider.GOOGLE_DRIVE.value,
                provider_email=provider_email,
                defaults={
                    "access_token": credentials.token,
                    "refresh_token": credentials.refresh_token or "",
                    "token_expiry": credentials.expiry,
                    "is_active": True,
                },
            )

            serializer = StorageAccountSerializer(storage_account)
            return Response(
                {
                    "message": "Google Drive connected successfully",
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Google OAuth callback failed: {str(e)}")
            return Response(
                {"error": "Failed to connect Google Drive. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
