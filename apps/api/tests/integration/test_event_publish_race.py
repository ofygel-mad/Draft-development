from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import close_old_connections


@pytest.mark.django_db(transaction=True)
def test_publish_event_is_idempotent_under_race(org, user):
    from apps.automations.models import DomainEvent
    from apps.automations.services.event_publisher import publish_event

    dedupe_key = 'race-dedupe-key-1'

    def _publish():
        close_old_connections()
        return publish_event(
            organization_id=org.id,
            event_type='customer.created',
            entity_type='customer',
            entity_id=user.id,
            actor_id=user.id,
            payload={'name': 'race'},
            dedupe_key=dedupe_key,
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: _publish(), range(8)))

    assert DomainEvent.objects.filter(dedupe_key=dedupe_key).count() == 1
    assert len([r for r in results if r is not None]) == 8
