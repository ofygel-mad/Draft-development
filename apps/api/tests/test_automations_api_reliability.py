import pytest


@pytest.mark.django_db
def test_create_from_template_idempotent_and_audited(api_client, org, user):
    from apps.audit.models import AuditLog
    from apps.automations.models import AutomationTemplate

    AutomationTemplate.objects.create(
        code='deal_created',
        name='Deal created template',
        description='template',
        trigger_type='deal.created',
        default_conditions=[{'operator': 'AND', 'conditions': []}],
        default_actions=[{'action_type': 'notify', 'config_json': {}}],
        is_active=True,
    )

    url = '/api/v1/automations/from_template/'
    payload = {'template_code': 'deal_created'}

    response1 = api_client.post(url, payload, format='json', HTTP_IDEMPOTENCY_KEY='same-key')
    response2 = api_client.post(url, payload, format='json', HTTP_IDEMPOTENCY_KEY='same-key')

    assert response1.status_code == 201
    assert response2.status_code == 200
    assert response1.data['id'] == response2.data['id']
    assert AuditLog.objects.filter(
        organization=org,
        actor=user,
        action='create',
        entity_type='automation_rule',
        entity_id=response1.data['id'],
    ).exists()


@pytest.mark.django_db
def test_create_from_template_negative_template_not_found(api_client):
    response = api_client.post(
        '/api/v1/automations/from_template/',
        {'template_code': 'missing'},
        format='json',
    )

    assert response.status_code == 404
