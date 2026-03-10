import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetDocument(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    uploaded_by_user_id = models.UUIDField(db_index=True)
    storage_key = models.CharField(max_length=500)


class SpreadsheetVersion(TimeStampedModel):
    class SourceType(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        REGENERATED = "regenerated", "Regenerated"
        SYNCED = "synced", "Synced"
        AI_MODIFIED = "ai_modified", "AI Modified"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(SpreadsheetDocument, related_name="versions", on_delete=models.CASCADE)
    version_number = models.PositiveIntegerField()
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.UPLOADED)
    storage_key = models.CharField(max_length=500)
    checksum = models.CharField(max_length=128, blank=True)
    created_by_user_id = models.UUIDField(db_index=True)

    class Meta:
        unique_together = ("document", "version_number")
        ordering = ["-version_number"]


class SpreadsheetSheet(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(SpreadsheetVersion, related_name="sheets", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField()
    max_row = models.PositiveIntegerField(default=0)
    max_col = models.PositiveIntegerField(default=0)
    detected_table_ranges = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("version", "name")
        ordering = ["position"]


class SpreadsheetMapping(TimeStampedModel):
    class SyncMode(models.TextChoices):
        IMPORT_ONLY = "import_only", "Import only"
        BIDIRECTIONAL = "bidirectional", "Bidirectional"
        EXPORT_TEMPLATE = "export_template", "Export template"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(SpreadsheetDocument, related_name="mappings", on_delete=models.CASCADE)
    sheet_name = models.CharField(max_length=255)
    range_ref = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=64)
    mapping = models.JSONField(default=dict)
    sync_mode = models.CharField(max_length=20, choices=SyncMode.choices, default=SyncMode.IMPORT_ONLY)


class SpreadsheetBinding(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mapping = models.ForeignKey(SpreadsheetMapping, related_name="bindings", on_delete=models.CASCADE)
    entity_type = models.CharField(max_length=64)
    entity_id = models.UUIDField(db_index=True)
    sheet_name = models.CharField(max_length=255)
    row_index = models.PositiveIntegerField()
    binding_key = models.CharField(max_length=255)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("mapping", "sheet_name", "row_index")


class SpreadsheetStyleSnapshot(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(SpreadsheetVersion, related_name="style_snapshots", on_delete=models.CASCADE)
    sheet_name = models.CharField(max_length=255)
    range_ref = models.CharField(max_length=100)
    style = models.JSONField(default=dict)
    merged_ranges = models.JSONField(default=list, blank=True)
    column_widths = models.JSONField(default=dict, blank=True)
    row_heights = models.JSONField(default=dict, blank=True)
    conditional_formats = models.JSONField(default=list, blank=True)
    data_validations = models.JSONField(default=list, blank=True)


class SpreadsheetSyncJob(TimeStampedModel):
    class Direction(models.TextChoices):
        TO_DB = "to_db", "To DB"
        FROM_DB = "from_db", "From DB"
        BIDIRECTIONAL = "bidirectional", "Bidirectional"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(SpreadsheetDocument, related_name="sync_jobs", on_delete=models.CASCADE)
    direction = models.CharField(max_length=20, choices=Direction.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    summary = models.JSONField(default=dict, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)


class SpreadsheetExportJob(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(SpreadsheetDocument, related_name="export_jobs", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    summary = models.JSONField(default=dict, blank=True)
    storage_key = models.CharField(max_length=500, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
