from django.db import models
from apps.core.models import BaseModel


class Customer(BaseModel):
    class Status(models.TextChoices):
        NEW = 'new', 'Новый'
        ACTIVE = 'active', 'Активный'
        INACTIVE = 'inactive', 'Неактивный'
        ARCHIVED = 'archived', 'Архив'

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='customers')
    owner = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_customers')
    full_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True, db_index=True)
    email = models.EmailField(blank=True)
    bin_iin = models.CharField(max_length=12, blank=True, verbose_name='БИН/ИИН')
    source = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    last_contact_at = models.DateTimeField(null=True, blank=True, db_index=True)
    next_action_at = models.DateTimeField(null=True, blank=True, db_index=True)
    next_action_note = models.CharField(max_length=500, blank=True)
    stalled_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'customers'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'owner']),
            models.Index(fields=['organization', 'deleted_at']),
            models.Index(fields=['organization', '-created_at']),
        ]

    def __str__(self):
        return self.full_name
