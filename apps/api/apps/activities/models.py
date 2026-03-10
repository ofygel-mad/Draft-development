from django.db import models
from apps.core.models import BaseModel


class Activity(BaseModel):
    class Type(models.TextChoices):
        NOTE = 'note', 'Заметка'
        CALL = 'call', 'Звонок'
        MESSAGE = 'message', 'Сообщение'
        STATUS_CHANGE = 'status_change', 'Смена статуса'
        STAGE_CHANGE = 'stage_change', 'Смена стадии'
        DEAL_CREATED = 'deal_created', 'Сделка создана'
        TASK_CREATED = 'task_created', 'Задача создана'
        TASK_DONE = 'task_done', 'Задача выполнена'

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    deal = models.ForeignKey('deals.Deal', on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    task = models.ForeignKey('tasks.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    type = models.CharField(max_length=30, choices=Type.choices)
    payload = models.JSONField(default=dict)

    class Meta:
        db_table = 'activities'
        indexes = [
            models.Index(fields=['organization', 'customer', '-created_at']),
            models.Index(fields=['organization', 'deal', '-created_at']),
        ]
        ordering = ['-created_at']
