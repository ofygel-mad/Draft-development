import pytest


@pytest.mark.django_db
def test_presence_heartbeat(auth_client):
    response = auth_client.post('/api/v1/team/presence/heartbeat', {'state': 'online'}, format='json')
    assert response.status_code == 200
