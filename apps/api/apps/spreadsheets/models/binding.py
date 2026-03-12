from django.db import models

from apps.core.models import BaseModel
from apps.spreadsheets.domain import SpreadsheetMappingEntityType


class SpreadsheetBinding(BaseModel):
    mapping = models.ForeignKey(
        "spreadsheets.SpreadsheetMapping",
        on_delete=models.CASCADE,
        related_name="bindings",
    )
    entity_type = models.CharField(
        max_length=32,
        choices=SpreadsheetMappingEntityType.choices,
        db_index=True,
    )
    entity_id = models.UUIDField(db_index=True)
    sheet_name = models.CharField(max_length=255)
    row_index = models.PositiveIntegerField()
    binding_key = models.CharField(max_length=255, db_index=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_sync_direction = models.CharField(max_length=32, default='spreadsheet_to_crm')
    conflict_state = models.CharField(max_length=32, default='clean', db_index=True)
    crm_record_version = models.PositiveIntegerField(default=1)
    spreadsheet_row_hash = models.CharField(max_length=128, blank=True, default='', db_index=True)

    class Meta:
        db_table = "spreadsheet_bindings"
        indexes = [
            models.Index(fields=["mapping", "sheet_name", "row_index"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["mapping", "sheet_name", "row_index"],
                name="uq_spreadsheet_binding_row_per_mapping",
            ),
            models.UniqueConstraint(
                fields=["mapping", "binding_key"],
                name="uq_spreadsheet_binding_key_per_mapping",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.entity_type}:{self.entity_id} -> row {self.row_index}"
