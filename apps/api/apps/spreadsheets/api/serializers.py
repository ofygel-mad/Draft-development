from rest_framework import serializers

from apps.spreadsheets.models import SpreadsheetDocument
from apps.spreadsheets.services.upload_spreadsheet import upload_spreadsheet


class SpreadsheetDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpreadsheetDocument
        fields = [
            "id",
            "organization_id",
            "title",
            "original_filename",
            "mime_type",
            "uploaded_by_user_id",
            "storage_key",
            "status",
            "current_version_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SpreadsheetUploadSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    uploaded_by_user_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    filename = serializers.CharField(max_length=255)
    mime_type = serializers.CharField(max_length=100)
    storage_key = serializers.CharField(max_length=500)

    def create(self, validated_data):
        return upload_spreadsheet(**validated_data).document
