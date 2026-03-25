from django.conf import settings
from rest_framework import serializers

from chunking.distributor import ChunkDistributor
from chunking.exceptions import InsufficientStorageError
from drive.helpers import get_active_drive
from endless_storage import logger
from storage.connectors import get_connector
from storage.services import get_account_quotas

from ..constants import ChunkStatus
from ..models import File, FileChunk
from .file_serializers import FileSerializer


class InitUploadSerializer(serializers.Serializer):
    file_name = serializers.CharField(required=True)
    file_size = serializers.IntegerField(default=0)
    mime_type = serializers.CharField(default="application/octet-stream")
    folder_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        request = self.context.get("request")

        try:
            account_quotas = get_account_quotas(request.user)
        except ValueError as e:
            raise serializers.ValidationError({"error": str(e)})

        distributor = ChunkDistributor()
        try:
            allocation = distributor.compute_allocation(
                attrs.get("file_size", 0), account_quotas
            )
        except InsufficientStorageError as e:
            raise serializers.ValidationError({"error": str(e)})

        attrs["allocation"] = allocation

        request_origin = request.META.get("HTTP_ORIGIN", "")
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", None)
        if allowed_origins is None or request_origin in allowed_origins:
            origin = request_origin
        else:
            origin = ""
        attrs["origin"] = origin

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        drive = get_active_drive(request)

        folder = None
        folder_id = validated_data.get("folder_id")
        if folder_id:
            from ..models import Folder

            try:
                folder = Folder.objects.get(id=folder_id, drive=drive)
            except Folder.DoesNotExist:
                pass

        file = File.objects.create(
            name=validated_data["file_name"],
            owner=request.user,
            drive=drive,
            folder=folder,
            mime_type=validated_data["mime_type"],
            file_size=validated_data["file_size"],
            total_chunks=len(validated_data["allocation"]),
        )

        chunks = []
        for entry in validated_data["allocation"]:
            FileChunk.objects.create(
                file=file,
                chunk_index=entry["chunk_index"],
                storage_account=entry["storage_account"],
                chunk_size=entry["chunk_size"],
            )

            connector = get_connector(entry["storage_account"])
            chunk_name = (
                f"{file.name}.chunk{entry['chunk_index']}"
                if len(validated_data["allocation"]) > 1
                else file.name
            )
            upload_info = connector.get_upload_url(
                chunk_name, file.mime_type, origin=validated_data["origin"]
            )

            chunks.append(
                {
                    "chunk_index": entry["chunk_index"],
                    "upload_url": upload_info["url"],
                    "upload_method": upload_info["method"],
                    "content_type": upload_info.get("content_type"),
                    "external_id": upload_info.get("external_id"),
                    "chunk_size": entry["chunk_size"],
                }
            )

        return {
            "file_id": str(file.id),
            "chunks": chunks,
        }


class ConfirmChunkSerializer(serializers.Serializer):
    chunk_index = serializers.IntegerField(required=True)
    external_chunk_id = serializers.CharField(required=True)

    def validate(self, attrs):
        file = self.context.get("file")
        chunk_index = attrs["chunk_index"]

        try:
            chunk = FileChunk.objects.get(file=file, chunk_index=chunk_index)
        except FileChunk.DoesNotExist:
            raise serializers.ValidationError(
                {"error": f"Chunk {chunk_index} not found"}
            )

        # Verify the chunk exists on the drive
        connector = get_connector(chunk.storage_account)
        try:
            metadata = connector.get_file_metadata(attrs["external_chunk_id"])
        except Exception as e:
            logger.error(f"Failed to verify chunk {chunk_index}: {e}")
            raise serializers.ValidationError(
                {"error": "Failed to verify chunk on storage provider"}
            )

        attrs["chunk"] = chunk
        attrs["metadata"] = metadata
        return attrs

    def create(self, validated_data):
        chunk = validated_data["chunk"]
        metadata = validated_data["metadata"]

        chunk.external_chunk_id = validated_data["external_chunk_id"]
        chunk.chunk_size = int(metadata.get("size", chunk.chunk_size))
        chunk.upload_status = ChunkStatus.UPLOADED
        chunk.save(update_fields=["external_chunk_id", "chunk_size", "upload_status"])

        file = chunk.file
        total = file.total_chunks
        uploaded = file.chunks.filter(upload_status=ChunkStatus.UPLOADED).count()
        all_uploaded = uploaded == total

        response_data = {
            "chunk_index": chunk.chunk_index,
            "status": chunk.upload_status,
            "all_chunks_uploaded": all_uploaded,
        }

        if all_uploaded:
            request = self.context.get("request")
            serializer = FileSerializer(file, context={"request": request})
            response_data["file"] = serializer.data

        return response_data
