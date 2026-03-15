from rest_framework import serializers

from endless_storage import logger

from ..constants import StorageProvider
from ..services import connect_dropbox, connect_google_drive, connect_onedrive

_CONNECT_FN = {
    StorageProvider.GOOGLE_DRIVE.value: connect_google_drive,
    StorageProvider.ONEDRIVE.value: connect_onedrive,
    StorageProvider.DROPBOX.value: connect_dropbox,
}

_PROVIDER_LABEL = {
    StorageProvider.GOOGLE_DRIVE.value: "Google Drive",
    StorageProvider.ONEDRIVE.value: "OneDrive",
    StorageProvider.DROPBOX.value: "Dropbox",
}


class OAuthCallbackSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(
        choices=StorageProvider.choices(),
        error_messages={"required": "Provider is required"},
    )
    code = serializers.CharField(
        required=True,
        error_messages={"required": "Authorization code is required"},
    )

    def create(self, validated_data):
        request = self.context["request"]
        provider = validated_data["provider"]
        code = validated_data["code"]

        connect_fn = _CONNECT_FN[provider]
        label = _PROVIDER_LABEL[provider]

        try:
            return connect_fn(request.user, code)
        except Exception as e:
            logger.error(f"{label} OAuth callback failed: {str(e)}")
            raise serializers.ValidationError(
                {"error": f"Failed to connect {label}. Please try again."}
            )
