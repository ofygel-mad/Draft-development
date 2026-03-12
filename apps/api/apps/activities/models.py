import uuid

from django.db import models
from apps.core.models import BaseModel


class Activity(BaseModel):
    class Type(models.TextChoices):
        NOTE = 'note', 'Заметка'
        CALL = 'call', 'Звонок'
        MESSAGE = 'message', 'Сообщение'
        EMAIL_SENT = 'email_sent', 'Email отправлен'
        EMAIL_IN = 'email_in', 'Email получен'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        STATUS_CHANGE = 'status_change', 'Смена статуса'
        STAGE_CHANGE = 'stage_change', 'Смена стадии'
        DEAL_CREATED = 'deal_created', 'Сделка создана'
        TASK_CREATED = 'task_created', 'Задача создана'
        TASK_DONE = 'task_done', 'Задача выполнена'
        DOCUMENT_SENT = 'document_sent', 'Документ отправлен'
        CUSTOMER_CREATED = 'customer_created', 'Клиент добавлен'

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


class Note(BaseModel):
    """Заметки к клиентам и сделкам"""

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='notes')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, null=True, blank=True, related_name='activity_notes')
    deal = models.ForeignKey('deals.Deal', on_delete=models.CASCADE, null=True, blank=True, related_name='notes')
    body = models.TextField()

    class Meta:
        db_table = 'notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'customer', '-created_at']),
            models.Index(fields=['organization', 'deal', '-created_at']),
        ]

    def __str__(self):
        return f'Note by {self.author_id} on {self.created_at.date()}'


class MessageTemplate(models.Model):
    """Шаблоны сообщений для быстрых коммуникаций."""

    class Channel(models.TextChoices):
        WHATSAPP = 'whatsapp', 'WhatsApp'
        EMAIL = 'email', 'Email'
        CALL = 'call', 'Звонок'
        GENERAL = 'general', 'Общий'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='message_templates',
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='+',
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.GENERAL)
    name = models.CharField(max_length=255)
    body = models.TextField(help_text='Поддерживает {{customer.full_name}}, {{deal.title}}, {{manager.full_name}}')
    shortcut = models.CharField(max_length=30, blank=True, help_text='/shortcut')
    is_active = models.BooleanField(default=True)
    use_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_templates'
        ordering = ['-use_count', 'name']
        indexes = [
            models.Index(fields=['organization', 'channel', 'is_active']),
            models.Index(fields=['organization', 'shortcut']),
        ]

    def __str__(self):
        return self.name

    def render(self, context: dict) -> str:
        """Простая интерполяция {{key}} → value."""
        import re

        flat: dict[str, str] = {}
        for section, data in context.items():
            if isinstance(data, dict):
                for key, value in data.items():
                    normalized = str(value) if value is not None else ''
                    flat[f'{section}.{key}'] = normalized
                    flat[key] = normalized

        return re.sub(r'\{\{(.+?)\}\}', lambda m: flat.get(m.group(1).strip(), m.group(0)), self.body)
