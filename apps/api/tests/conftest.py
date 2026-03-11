import pytest
from django.contrib.auth import get_user_model

User = get_user_model()
pytest_plugins = []


@pytest.fixture
def org(db):
    from apps.organizations.models import Organization
    return Organization.objects.create(name='Test Org', slug='test-org', mode='advanced')


@pytest.fixture
def user(db, org):
    u = User.objects.create_user(
        email='test@test.com', password='pass123',
        full_name='Test User', organization=org,
    )
    from apps.users.models import OrganizationMembership
    OrganizationMembership.objects.create(user=u, organization=org, role='owner')
    return u


@pytest.fixture
def user2(db, org):
    return User.objects.create_user(
        email='user2@test.com', password='pass123',
        full_name='User Two', organization=org,
    )


@pytest.fixture
def api_client(user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.fixture
def customer(db, org, user):
    from apps.customers.models import Customer
    return Customer.objects.create(
        organization=org, owner=user,
        full_name='John Doe', phone='+77001234567',
        email='john@example.com', status='new', source='instagram',
    )


@pytest.fixture
def pipeline(db, org):
    from apps.core.services import ensure_default_pipeline
    return ensure_default_pipeline(org)


@pytest.fixture
def deal(db, org, user, customer, pipeline):
    from apps.deals.models import Deal
    stage = pipeline.stages.first()
    return Deal.objects.create(
        organization=org, owner=user, customer=customer,
        pipeline=pipeline, stage=stage,
        title='Test Deal', amount=100000, currency='RUB',
    )
