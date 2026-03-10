import uuid
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Создание'
        UPDATE = 'update', 'Обновление'
        DELETE = 'delete', 'Удаление'
        LOGIN = 'login', 'Вход'
        LOGOUT = 'logout', 'Выход'
        EXPORT = 'export', 'Экспорт'
        IMPORT = 'import', 'Импорт'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='audit_logs',
    )
    actor = models.ForeignKey(
        'users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs',
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    entity_type = models.CharField(max_length=50, db_index=True)
    entity_id = models.UUIDField(null=True, blank=True)
    entity_label = models.CharField(max_length=255, blank=True)
    diff = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['organization', 'entity_type', 'entity_id']),
            models.Index(fields=['organization', 'actor', '-created_at']),
        ]

    def __str__(self):
        return f'{self.action} {self.entity_type} by {self.actor_id}'
