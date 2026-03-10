import uuid
from django.db import models
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
    currency = models.CharField(max_length=3, default='RUB')
    logo_url = models.URLField(blank=True, null=True)
    onboarding_completed = models.BooleanField(default=False)

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
        'activities.read', 'reports.basic', 'imports.customers',
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
    OrganizationCapability.objects.bulk_create(
        [OrganizationCapability(organization=org, capability_code=c) for c in all_caps],
        ignore_conflicts=True,
    )
