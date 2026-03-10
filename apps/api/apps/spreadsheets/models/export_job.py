import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetExportJob(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey("spreadsheets.SpreadsheetDocument", related_name="export_jobs", on_delete=models.CASCADE)
    version = models.ForeignKey(
        "spreadsheets.SpreadsheetVersion",
        related_name="export_jobs",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    summary = models.JSONField(default=dict, blank=True)
    error_text = models.TextField(blank=True)
    output_storage_key = models.CharField(max_length=500, blank=True)
    created_by_user_id = models.UUIDField(db_index=True, null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
