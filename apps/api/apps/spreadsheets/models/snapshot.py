import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetStyleSnapshot(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey("spreadsheets.SpreadsheetVersion", related_name="style_snapshots", on_delete=models.CASCADE)
    sheet_name = models.CharField(max_length=255)
    range_ref = models.CharField(max_length=100)
    style = models.JSONField(default=dict)
    merged_ranges = models.JSONField(default=list, blank=True)
    column_widths = models.JSONField(default=dict, blank=True)
    row_heights = models.JSONField(default=dict, blank=True)
    conditional_formats = models.JSONField(default=list, blank=True)
    data_validations = models.JSONField(default=list, blank=True)
    freeze_panes = models.JSONField(default=dict, blank=True)
    filters = models.JSONField(default=dict, blank=True)
