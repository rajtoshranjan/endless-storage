from rest_framework import serializers

from endless_storage import logger

from ..services import connect_google_drive


class GoogleAuthCallbackSerializer(serializers.Serializer):
    code = serializers.CharField(
        required=True,
        error_messages={"required": "Authorization code is required"},
    )

    def create(self, validated_data):
        request = self.context.get("request")
        code = validated_data["code"]

        try:
            return connect_google_drive(request.user, code)
        except Exception as e:
            logger.error(f"Google OAuth callback failed: {str(e)}")
            raise serializers.ValidationError(
                {"error": "Failed to connect Google Drive. Please try again."}
            )
