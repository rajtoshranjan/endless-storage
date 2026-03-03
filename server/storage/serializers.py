from rest_framework import serializers

from .models import StorageAccount


class StorageAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageAccount
        fields = ["id", "provider", "provider_email", "is_active", "created_at"]
        read_only_fields = [
            "id",
            "provider",
            "provider_email",
            "is_active",
            "created_at",
        ]
