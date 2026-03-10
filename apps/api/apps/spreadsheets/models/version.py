import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetVersion(TimeStampedModel):
    class SourceType(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        REGENERATED = "regenerated", "Regenerated"
        SYNCED_FROM_DB = "synced_from_db", "Synced from DB"
        AI_MODIFIED = "ai_modified", "AI Modified"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey("spreadsheets.SpreadsheetDocument", related_name="versions", on_delete=models.CASCADE)
    version_number = models.PositiveIntegerField()
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.UPLOADED)
    storage_key = models.CharField(max_length=500)
    checksum = models.CharField(max_length=128, blank=True)
    created_by_user_id = models.UUIDField(db_index=True)

    class Meta:
        unique_together = ("document", "version_number")
        ordering = ["-version_number"]
