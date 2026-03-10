import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class SpreadsheetAIAnalysis(TimeStampedModel):
    class AnalysisType(models.TextChoices):
        MAPPING_SUGGESTION = "mapping_suggestion", "Mapping suggestion"
        ANOMALY_REPORT = "anomaly_report", "Anomaly report"
        FORMULA_EXPLANATION = "formula_explanation", "Formula explanation"
        SYNC_RECOMMENDATION = "sync_recommendation", "Sync recommendation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey("spreadsheets.SpreadsheetDocument", related_name="ai_analyses", on_delete=models.CASCADE)
    version = models.ForeignKey("spreadsheets.SpreadsheetVersion", related_name="ai_analyses", on_delete=models.CASCADE)
    analysis_type = models.CharField(max_length=50, choices=AnalysisType.choices)
    result = models.JSONField(default=dict, blank=True)
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True, blank=True)
