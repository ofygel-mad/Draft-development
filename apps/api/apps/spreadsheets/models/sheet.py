import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetSheet(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey("spreadsheets.SpreadsheetVersion", related_name="sheets", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField()
    max_row = models.PositiveIntegerField(default=0)
    max_col = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    detected_table_ranges = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("version", "name")
        ordering = ["position"]
