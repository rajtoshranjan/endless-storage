from rest_framework import serializers

from drive.helpers import get_active_drive

from ..models import Folder


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ["id", "name", "created_at", "modified_at"]
        read_only_fields = ["id", "created_at", "modified_at"]


class FolderCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    parent_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        request = self.context["request"]
        drive = get_active_drive(request)
        parent_id = attrs.get("parent_id")

        if parent_id:
            try:
                parent = Folder.objects.get(id=parent_id, drive=drive)
            except Folder.DoesNotExist:
                raise serializers.ValidationError({"parent_id": "Folder not found."})
            attrs["parent"] = parent
        else:
            attrs["parent"] = None

        attrs["drive"] = drive
        return attrs

    def create(self, validated_data):
        return Folder.objects.create(
            name=validated_data["name"],
            drive=validated_data["drive"],
            parent=validated_data.get("parent"),
        )


class FolderRenameSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

    def update(self, instance, validated_data):
        instance.name = validated_data["name"]
        instance.save(update_fields=["name"])
        return instance


class FolderMoveSerializer(serializers.Serializer):
    parent_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        request = self.context["request"]
        folder = self.context["folder"]
        drive = get_active_drive(request)
        parent_id = attrs.get("parent_id")

        if parent_id:
            try:
                new_parent = Folder.objects.get(id=parent_id, drive=drive)
            except Folder.DoesNotExist:
                raise serializers.ValidationError({"parent_id": "Folder not found."})

            if new_parent.id == folder.id:
                raise serializers.ValidationError(
                    {"parent_id": "A folder cannot be moved into itself."}
                )

            if folder.is_ancestor_of(new_parent):
                raise serializers.ValidationError(
                    {
                        "parent_id": "Cannot move a folder into one of its own subfolders."
                    }
                )

            attrs["new_parent"] = new_parent
        else:
            attrs["new_parent"] = None

        return attrs

    def update(self, instance, validated_data):
        instance.parent = validated_data["new_parent"]
        instance.save(update_fields=["parent"])
        return instance
