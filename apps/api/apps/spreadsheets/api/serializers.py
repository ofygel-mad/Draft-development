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


from apps.spreadsheets.models import SpreadsheetMapping, SpreadsheetSyncJob


class SpreadsheetMappingReviewSerializer(serializers.Serializer):
    column_key = serializers.CharField()
    target_entity = serializers.ChoiceField(choices=['customer', 'deal', 'task', 'organization'])
    target_field = serializers.CharField()
    confidence = serializers.FloatField()
    warnings = serializers.ListField(child=serializers.CharField(), required=False)
    sample_values = serializers.ListField(child=serializers.CharField(), required=False)


class SpreadsheetAnalysisPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpreadsheetDocument
        fields = ['id','status','analysis_confidence','preview_payload','last_error_code','last_error_message','sync_policy','created_at']


class SpreadsheetSyncRequestSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    mapping_revision = serializers.IntegerField(min_value=1)
    conflict_policy = serializers.ChoiceField(choices=['crm_wins', 'spreadsheet_wins', 'manual_review'])
    preview_only = serializers.BooleanField(default=False)


class SpreadsheetSyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpreadsheetSyncJob
        fields = '__all__'
