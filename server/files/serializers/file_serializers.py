from rest_framework import serializers

from drive.helpers import get_active_drive

from ..models import File


class FileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = File
        fields = [
            "id",
            "name",
            "size",
            "mime_type",
            "file",
            "created_at",
            "modified_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "modified_at",
            "size",
            "name",
            "mime_type",
        ]

    def validate(self, attrs):
        validated_data = super().validate(attrs)

        drive = get_active_drive(self.context["request"])
        validated_data["drive"] = drive

        if file := validated_data.get("file"):
            validated_data["name"] = file.name

        return validated_data


class SharedFileSerializer(serializers.Serializer):
    shared_by_name = serializers.CharField(source="file.owner.name", read_only=True)
    shared_by_email = serializers.CharField(source="file.owner.email", read_only=True)
    can_download = serializers.BooleanField(read_only=True)
    file = FileSerializer(read_only=True)
