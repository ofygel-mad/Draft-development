from django.db import models

from apps.core.models import BaseModel
from apps.spreadsheets.domain import SpreadsheetJobStatus, SpreadsheetSyncDirection


class SpreadsheetSyncJob(BaseModel):
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(
        "spreadsheets.SpreadsheetDocument",
        on_delete=models.CASCADE,
        related_name="sync_jobs",
    )
    mapping = models.ForeignKey(
        "spreadsheets.SpreadsheetMapping",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sync_jobs",
    )
    direction = models.CharField(
        max_length=32,
        choices=SpreadsheetSyncDirection.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=32,
        choices=SpreadsheetJobStatus.choices,
        default=SpreadsheetJobStatus.PENDING,
        db_index=True,
    )
    summary_json = models.JSONField(default=dict, blank=True)
    error_text = models.TextField(blank=True)
    created_by_user_id = models.UUIDField(db_index=True, null=True, blank=True)
    idempotency_key = models.CharField(max_length=128, blank=True, default='', db_index=True)
    preview_only = models.BooleanField(default=False)
    totals = models.JSONField(default=dict, blank=True)
    conflict_policy = models.CharField(max_length=32, default='manual_review')
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "spreadsheet_sync_jobs"
        indexes = [
            models.Index(fields=["organization_id", "status", "created_at"]),
            models.Index(fields=["document", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.document_id}:{self.direction}:{self.status}"
