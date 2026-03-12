import uuid
from django.db import models, transaction
from apps.core.models import BaseModel


class Organization(BaseModel):
    class Mode(models.TextChoices):
        BASIC = 'basic', 'Basic'
        ADVANCED = 'advanced', 'Advanced'
        INDUSTRIAL = 'industrial', 'Industrial'

    class Industry(models.TextChoices):
        RETAIL = 'retail', 'Розница'
        SERVICES = 'services', 'Услуги'
        SALES = 'sales', 'Продажи'
        PRODUCTION = 'production', 'Производство'
        OTHER = 'other', 'Другое'

    class CompanySize(models.TextChoices):
        XS = '1_5', '1–5'
        SM = '6_20', '6–20'
        MD = '21_100', '21–100'
        LG = '100plus', '100+'

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=120, unique=True)
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.BASIC)
    industry = models.CharField(max_length=50, choices=Industry.choices, default=Industry.OTHER)
    company_size = models.CharField(max_length=20, choices=CompanySize.choices, default=CompanySize.XS)
    timezone = models.CharField(max_length=64, default='UTC')
    currency = models.CharField(max_length=3, default='KZT')
    logo_url = models.URLField(blank=True, null=True)
    onboarding_completed = models.BooleanField(default=False)
    # Email integration (IMAP/SMTP)
    email_host = models.CharField(max_length=255, blank=True)
    email_port = models.PositiveSmallIntegerField(default=587)
    email_username = models.CharField(max_length=255, blank=True)
    email_password = models.CharField(max_length=512, blank=True)  # encrypted in prod
    email_use_tls = models.BooleanField(default=True)
    email_from = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'organizations'

    def __str__(self):
        return self.name


class OrganizationCapability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='capabilities')
    capability_code = models.CharField(max_length=100)
    enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'organization_capabilities'
        unique_together = [('organization', 'capability_code')]


MODE_CAPABILITIES = {
    'basic': [
        'customers.read', 'customers.create', 'customers.update',
        'deals.read', 'deals.create', 'deals.update',
        'tasks.read', 'tasks.create', 'tasks.update',
        'activities.read', 'reports.read', 'imports.read', 'imports.upload', 'customers.import',
    ],
    'advanced': [
        'automations.manage', 'pipelines.multi', 'roles.manage',
        'reports.advanced', 'imports.deals', 'exports.advanced',
    ],
    'industrial': [
        'branches.manage', 'audit.read', 'api.access',
        'custom_fields.manage', 'reports.industrial',
    ],
}


def apply_mode_capabilities(org: Organization) -> None:
    """Create capability rows for an org based on its mode."""
    all_caps: set[str] = set()
    for m in ['basic', 'advanced', 'industrial']:
        all_caps.update(MODE_CAPABILITIES.get(m, []))
        if m == org.mode:
            break
    with transaction.atomic():
        OrganizationCapability.objects.filter(organization=org).delete()
        OrganizationCapability.objects.bulk_create([
            OrganizationCapability(organization=org, capability_code=c)
            for c in all_caps
        ])


class CustomField(models.Model):
    class FieldType(models.TextChoices):
        TEXT = 'text', 'Текст'
        NUMBER = 'number', 'Число'
        DATE = 'date', 'Дата'
        SELECT = 'select', 'Список'
        BOOLEAN = 'boolean', 'Да/Нет'
        URL = 'url', 'Ссылка'
        PHONE = 'phone', 'Телефон'

    class EntityType(models.TextChoices):
        CUSTOMER = 'customer', 'Клиент'
        DEAL = 'deal', 'Сделка'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='custom_fields')
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    name = models.CharField(max_length=100)
    field_key = models.SlugField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FieldType.choices, default=FieldType.TEXT)
    options = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=False)
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'custom_fields'
        ordering = ['entity_type', 'position']
        unique_together = [('organization', 'entity_type', 'field_key')]

    def __str__(self):
        return f'{self.entity_type}.{self.field_key}'


class CustomFieldValue(models.Model):
    """Значение кастомного поля для конкретного объекта."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    field = models.ForeignKey(CustomField, on_delete=models.CASCADE, related_name='values')
    entity_type = models.CharField(max_length=20)
    entity_id = models.UUIDField(db_index=True)
    value_json = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_field_values'
        unique_together = [('field', 'entity_id')]
        indexes = [models.Index(fields=['entity_type', 'entity_id'])]


class Branch(BaseModel):
    """Филиал / офис организации."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    manager = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_branches',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'branches'
        ordering = ['name']

    def __str__(self):
        return f'{self.organization.name} / {self.name}'
