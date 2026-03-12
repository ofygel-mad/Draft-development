import pytest


@pytest.mark.django_db
def test_spreadsheet_preview_requires_auth(api_client):
    response = api_client.get('/api/v1/spreadsheets/00000000-0000-0000-0000-000000000000/preview/')
    assert response.status_code in (401, 403)
