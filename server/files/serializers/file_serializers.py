from rest_framework import serializers

from drive.helpers import get_active_drive

from ..models import File, Folder


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


class FileMoveSerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        request = self.context["request"]
        drive = get_active_drive(request)
        folder_id = attrs.get("folder_id")

        if folder_id:
            try:
                attrs["folder"] = Folder.objects.get(id=folder_id, drive=drive)
            except Folder.DoesNotExist:
                raise serializers.ValidationError({"folder_id": "Folder not found."})
        else:
            attrs["folder"] = None

        return attrs

    def update(self, instance, validated_data):
        instance.folder = validated_data["folder"]
        instance.save(update_fields=["folder"])
        return instance


class SharedFileSerializer(serializers.Serializer):
    shared_by_name = serializers.CharField(source="file.owner.name", read_only=True)
    shared_by_email = serializers.CharField(source="file.owner.email", read_only=True)
    can_download = serializers.BooleanField(read_only=True)
    file = FileSerializer(read_only=True)
