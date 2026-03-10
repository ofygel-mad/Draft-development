import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetDocument(TimeStampedModel):
    class Status(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        ANALYZING = "analyzing", "Analyzing"
        READY = "ready", "Ready"
        SYNC_ERROR = "sync_error", "Sync error"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    uploaded_by_user_id = models.UUIDField(db_index=True)
    current_version = models.ForeignKey(
        "spreadsheets.SpreadsheetVersion",
        related_name="+",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    storage_key = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADED)
