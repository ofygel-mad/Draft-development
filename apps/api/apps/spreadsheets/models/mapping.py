from django.db import models

from apps.core.models import BaseModel
from apps.spreadsheets.domain import SpreadsheetMappingEntityType, SpreadsheetMappingSyncMode


class SpreadsheetMapping(BaseModel):
    organization_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(
        "spreadsheets.SpreadsheetDocument",
        on_delete=models.CASCADE,
        related_name="mappings",
    )
    sheet_name = models.CharField(max_length=255)
    range_ref = models.CharField(max_length=64, help_text="Example: A1:F200")
    entity_type = models.CharField(
        max_length=32,
        choices=SpreadsheetMappingEntityType.choices,
        db_index=True,
    )
    sync_mode = models.CharField(
        max_length=32,
        choices=SpreadsheetMappingSyncMode.choices,
        default=SpreadsheetMappingSyncMode.IMPORT_ONLY,
        db_index=True,
    )
    mapping_json = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by_user_id = models.UUIDField(db_index=True, null=True, blank=True)
    sample_values = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    is_user_confirmed = models.BooleanField(default=False)
    confidence = models.FloatField(default=0, db_index=True)

    class Meta:
        db_table = "spreadsheet_mappings"
        indexes = [
            models.Index(fields=["organization_id", "entity_type", "is_active"]),
            models.Index(fields=["document", "sheet_name"]),
        ]

    def __str__(self) -> str:
        return f"{self.document_id}:{self.sheet_name}:{self.entity_type}"
