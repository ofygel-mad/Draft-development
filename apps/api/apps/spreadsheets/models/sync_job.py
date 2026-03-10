import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetSyncJob(TimeStampedModel):
    class Direction(models.TextChoices):
        TO_DB = "to_db", "To DB"
        FROM_DB = "from_db", "From DB"
        BIDIRECTIONAL = "bidirectional", "Bidirectional"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        PARTIAL = "partial", "Partial"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey("spreadsheets.SpreadsheetDocument", related_name="sync_jobs", on_delete=models.CASCADE)
    mapping = models.ForeignKey(
        "spreadsheets.SpreadsheetMapping",
        related_name="sync_jobs",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    direction = models.CharField(max_length=20, choices=Direction.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    summary = models.JSONField(default=dict, blank=True)
    error_text = models.TextField(blank=True)
    created_by_user_id = models.UUIDField(db_index=True, null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
