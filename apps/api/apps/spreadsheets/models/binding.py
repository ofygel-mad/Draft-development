import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetBinding(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mapping = models.ForeignKey("spreadsheets.SpreadsheetMapping", related_name="bindings", on_delete=models.CASCADE)
    entity_type = models.CharField(max_length=64)
    entity_id = models.UUIDField(db_index=True)
    sheet_name = models.CharField(max_length=255)
    row_index = models.PositiveIntegerField()
    binding_key = models.CharField(max_length=255)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("mapping", "sheet_name", "row_index")
