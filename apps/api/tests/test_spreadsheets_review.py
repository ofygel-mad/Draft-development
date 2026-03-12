import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import Organization
from apps.spreadsheets.models import SpreadsheetDocument


@pytest.mark.django_db
def test_spreadsheet_preview_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/spreadsheets/00000000-0000-0000-0000-000000000000/preview/')
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_spreadsheet_preview_is_organization_scoped(user, org):
    other_org = Organization.objects.create(name='Other Org', slug='other-org', mode='advanced')
    other_doc = SpreadsheetDocument.objects.create(
        organization_id=other_org.id,
        title='Other',
        original_filename='other.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_key='spreadsheets/other.xlsx',
        uploaded_by_user_id=user.id,
    )

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    response = client.get(f'/api/v1/spreadsheets/{other_doc.id}/preview/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_spreadsheet_sync_is_organization_scoped(user, org):
    other_org = Organization.objects.create(name='Third Org', slug='third-org', mode='advanced')
    other_doc = SpreadsheetDocument.objects.create(
        organization_id=other_org.id,
        title='Other',
        original_filename='other.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_key='spreadsheets/other-sync.xlsx',
        uploaded_by_user_id=user.id,
    )

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    payload = {
        'document_id': str(other_doc.id),
        'mapping_revision': 1,
        'conflict_policy': 'crm_wins',
        'preview_only': True,
    }
    response = client.post('/api/v1/spreadsheets/sync/', payload, format='json')
    assert response.status_code == 404


@pytest.mark.django_db
def test_spreadsheet_sync_idempotency_key_returns_existing_job(api_client, org, user):
    document = SpreadsheetDocument.objects.create(
        organization_id=org.id,
        title='Mine',
        original_filename='mine.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_key=f'spreadsheets/{uuid.uuid4()}.xlsx',
        uploaded_by_user_id=user.id,
    )

    payload = {
        'document_id': str(document.id),
        'mapping_revision': 1,
        'conflict_policy': 'crm_wins',
        'preview_only': True,
    }
    headers = {'HTTP_IDEMPOTENCY_KEY': 'sync-key-1'}

    first = api_client.post('/api/v1/spreadsheets/sync/', payload, format='json', **headers)
    second = api_client.post('/api/v1/spreadsheets/sync/', payload, format='json', **headers)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.data['id'] == second.data['id']
