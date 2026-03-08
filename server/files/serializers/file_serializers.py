from rest_framework import serializers

from ..models import File


class FileSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)

    class Meta:
        model = File
        fields = [
            "id",
            "name",
            "size",
            "mime_type",
            "total_chunks",
            "status",
            "created_at",
            "modified_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "size",
            "mime_type",
            "total_chunks",
            "status",
            "created_at",
            "modified_at",
        ]


class SharedFileSerializer(serializers.Serializer):
    shared_by_name = serializers.CharField(source="file.owner.name", read_only=True)
    shared_by_email = serializers.CharField(source="file.owner.email", read_only=True)
    can_download = serializers.BooleanField(read_only=True)
    file = FileSerializer(read_only=True)
