from django.db import models
from apps.core.models import BaseModel


class Task(BaseModel):
    class Priority(models.TextChoices):
        LOW = 'low', 'Низкий'
        MEDIUM = 'medium', 'Средний'
        HIGH = 'high', 'Высокий'

    class Status(models.TextChoices):
        OPEN = 'open', 'Открыта'
        DONE = 'done', 'Завершена'
        CANCELLED = 'cancelled', 'Отменена'

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='tasks')
    assigned_to = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tasks')
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    deal = models.ForeignKey('deals.Deal', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tasks'
        indexes = [
            models.Index(fields=['organization', 'assigned_to', 'status']),
            models.Index(fields=['organization', 'due_at']),
        ]
