from django.db import transaction
from django.utils.text import slugify
from apps.users.models import User, Role, OrganizationMembership
from apps.organizations.models import Organization
from apps.organizations.models import apply_mode_capabilities
from apps.core.services import ensure_default_pipeline


@transaction.atomic
def register_organization(
    *,
    organization_name: str,
    full_name: str,
    email: str,
    phone: str = '',
    password: str,
    industry: str = 'other',
    company_size: str = '1_5',
    mode: str = 'basic',
) -> tuple['User', 'Organization']:
    base_slug = slugify(organization_name) or 'org'
    slug = base_slug
    counter = 1
    while Organization.objects.filter(slug=slug).exists():
        slug = f'{base_slug}-{counter}'
        counter += 1

    org = Organization.objects.create(
        name=organization_name,
        slug=slug,
        mode=mode,
        industry=industry,
        company_size=company_size,
    )
    apply_mode_capabilities(org)
    ensure_default_pipeline(org)

    Role.objects.create(organization=org, name='Владелец', code='owner', is_system=True)
    Role.objects.create(organization=org, name='Менеджер', code='manager', is_system=True)

    user = User.objects.create_user(
        email=email,
        password=password,
        full_name=full_name,
        phone=phone,
        organization=org,
    )

    OrganizationMembership.objects.get_or_create(
        user=user,
        organization=org,
        defaults={'role': OrganizationMembership.Role.OWNER},
    )

    return user, org
