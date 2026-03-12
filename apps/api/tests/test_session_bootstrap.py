import pytest


@pytest.mark.django_db
def test_session_bootstrap_returns_capabilities(auth_client):
    response = auth_client.get('/api/v1/session/bootstrap/')
    assert response.status_code == 200
    assert 'capabilities' in response.json()
