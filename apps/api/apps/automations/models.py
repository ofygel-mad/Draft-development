import uuid

from django.db import models

from apps.core.models import BaseModel


class AutomationRule(BaseModel):
    """Правило автоматизации"""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Черновик'
        ACTIVE = 'active', 'Активно'
        PAUSED = 'paused', 'Приостановлено'
        ARCHIVED = 'archived', 'Архив'

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='automation_rules')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_template_based = models.BooleanField(default=False)
    template_code = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey('users.User', null=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        db_table = 'automation_rules'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['organization', 'trigger_type', 'status'])]

    def __str__(self):
        return self.name


class AutomationConditionGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='condition_groups')
    operator = models.CharField(max_length=10, default='AND')
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'automation_rule_condition_groups'
        ordering = ['position']


class AutomationCondition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='conditions')
    group = models.ForeignKey(AutomationConditionGroup, on_delete=models.CASCADE, related_name='conditions')
    field_path = models.CharField(max_length=255)
    operator = models.CharField(max_length=50)
    value_json = models.JSONField(null=True, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'automation_rule_conditions'
        ordering = ['position']


class AutomationAction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=100)
    config_json = models.JSONField(default=dict)
    position = models.PositiveSmallIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'automation_rule_actions'
        ordering = ['position']


class DomainEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    actor = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)
    source = models.CharField(max_length=50, default='system')
    payload_json = models.JSONField(default=dict)
    occurred_at = models.DateTimeField()
    dedupe_key = models.CharField(max_length=255, null=True, blank=True, unique=True)
    is_processed = models.BooleanField(default=False, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'domain_events'
        indexes = [
            models.Index(fields=['organization', 'event_type', '-occurred_at']),
            models.Index(fields=['organization', 'entity_type', 'entity_id']),
        ]


class AutomationExecution(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает'
        RUNNING = 'running', 'Выполняется'
        COMPLETED = 'completed', 'Выполнено'
        PARTIAL = 'partial', 'Частично'
        FAILED = 'failed', 'Ошибка'
        SKIPPED = 'skipped', 'Пропущено'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE)
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='executions')
    event = models.ForeignKey(DomainEvent, on_delete=models.CASCADE, related_name='executions')
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    idempotency_key = models.CharField(max_length=255, unique=True)
    execution_depth = models.PositiveSmallIntegerField(default=0)
    triggered_by_execution = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'automation_executions'
        indexes = [
            models.Index(fields=['organization', 'rule', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]


class AutomationExecutionAction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает'
        COMPLETED = 'completed', 'Выполнено'
        FAILED = 'failed', 'Ошибка'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    execution = models.ForeignKey(AutomationExecution, on_delete=models.CASCADE, related_name='action_logs')
    action = models.ForeignKey(AutomationAction, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    result_json = models.JSONField(null=True, blank=True)
    error_text = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'automation_execution_actions'


class AutomationTemplate(models.Model):
    """Встроенные шаблоны автоматизаций"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=100)
    default_conditions = models.JSONField(default=list)
    default_actions = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'automation_templates'

    def __str__(self):
        return self.name
