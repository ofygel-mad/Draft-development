import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetMapping(TimeStampedModel):
    class SyncMode(models.TextChoices):
        IMPORT_ONLY = "import_only", "Import only"
        EXPORT_ONLY = "export_only", "Export only"
        BIDIRECTIONAL = "bidirectional", "Bidirectional"
        TEMPLATE_ONLY = "template_only", "Template only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey("spreadsheets.SpreadsheetDocument", related_name="mappings", on_delete=models.CASCADE)
    sheet_name = models.CharField(max_length=255)
    range_ref = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=64)
    mapping = models.JSONField(default=dict)
    sync_mode = models.CharField(max_length=20, choices=SyncMode.choices, default=SyncMode.IMPORT_ONLY)
    is_active = models.BooleanField(default=True)
    created_by_user_id = models.UUIDField(db_index=True, null=True, blank=True)
