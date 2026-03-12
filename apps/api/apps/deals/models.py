from django.db import models
from apps.core.models import BaseModel


class Deal(BaseModel):
    class Status(models.TextChoices):
        OPEN = 'open', 'Открыта'
        WON = 'won', 'Выиграна'
        LOST = 'lost', 'Проиграна'
        PAUSED = 'paused', 'Пауза'

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='deals')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='deals')
    pipeline = models.ForeignKey('pipelines.Pipeline', on_delete=models.CASCADE, related_name='deals')
    stage = models.ForeignKey('pipelines.PipelineStage', on_delete=models.CASCADE, related_name='deals')
    owner = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_deals')
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='KZT')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    expected_close_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    next_step = models.CharField(max_length=500, blank=True)
    probability = models.PositiveSmallIntegerField(null=True, blank=True, help_text='0-100%')
    last_activity_at = models.DateTimeField(null=True, blank=True, db_index=True)
    loss_reason = models.CharField(max_length=300, blank=True)
    close_forecast_at = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'deals'
        indexes = [
            models.Index(fields=['organization', 'pipeline', 'stage']),
            models.Index(fields=['organization', 'status']),
        ]
