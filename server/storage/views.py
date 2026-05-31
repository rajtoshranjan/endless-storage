from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from endless_storage import logger
from storage.connectors import get_connector

from .constants import StorageProvider
from .models import StorageAccount
from .serializers import OAuthCallbackSerializer, StorageAccountSerializer
from .services import (
    get_dropbox_oauth_url,
    get_google_oauth_url,
    get_onedrive_oauth_url,
)

_AUTH_URL_FN = {
    StorageProvider.GOOGLE_DRIVE.value: get_google_oauth_url,
    StorageProvider.ONEDRIVE.value: get_onedrive_oauth_url,
    StorageProvider.DROPBOX.value: get_dropbox_oauth_url,
}


class StorageAccountViewSet(ModelViewSet):
    serializer_class = StorageAccountSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "delete", "post"]

    def get_queryset(self):
        return StorageAccount.objects.filter(
            user=self.request.user,
            is_active=True,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        total_limit = 0
        total_usage = 0
        total_remaining = 0

        for account in queryset:
            try:
                connector = get_connector(account)
                quota = connector.get_storage_quota()
                total_limit += quota.get("limit", 0)
                total_usage += quota.get("usage", 0)
                total_remaining += quota.get("remaining", 0)
            except Exception as e:
                logger.warning(f"Failed to fetch quota for account {account.id}: {e}")

        return Response(
            {
                "accounts": serializer.data,
                "quota": {
                    "limit": total_limit,
                    "usage": total_usage,
                    "remaining": total_remaining,
                },
            }
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=False, methods=["get"], url_path="auth-url")
    def auth_url(self, request):
        """GET /storage/auth-url/?provider=<provider>"""
        provider = request.query_params.get("provider")
        get_url_fn = _AUTH_URL_FN.get(provider)

        if not get_url_fn:
            valid = ", ".join(_AUTH_URL_FN.keys())
            return Response(
                {"error": f"Invalid provider. Must be one of: {valid}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        authorization_url, state = get_url_fn()
        return Response({"url": authorization_url, "state": state})

    @action(detail=False, methods=["post"], url_path="callback")
    def callback(self, request):
        """POST /storage/callback/ — body: { provider, code }"""
        serializer = OAuthCallbackSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        storage_account, created = serializer.save()

        return Response(
            {
                "message": f"{storage_account.provider} connected successfully",
                "data": StorageAccountSerializer(storage_account).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
