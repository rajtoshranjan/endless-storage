from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from endless_storage import logger
from storage.connectors import get_connector

from .models import StorageAccount
from .serializers import GoogleAuthCallbackSerializer, StorageAccountSerializer
from .services import get_google_oauth_url


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

    @action(detail=False, methods=["get"], url_path="google-auth-url")
    def google_auth_url(self, request):
        authorization_url, state = get_google_oauth_url()
        return Response(
            {"url": authorization_url, "state": state},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="google-callback")
    def google_callback(self, request):
        serializer = GoogleAuthCallbackSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        storage_account, created = serializer.save()

        storage_serializer = StorageAccountSerializer(storage_account)
        return Response(
            {
                "message": "Google Drive connected successfully",
                "data": storage_serializer.data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
