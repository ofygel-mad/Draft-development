from __future__ import annotations

import logging

from django.utils import timezone

from apps.automations.models import DomainEvent

logger = logging.getLogger(__name__)


def publish_event(
    *,
    organization_id,
    event_type: str,
    entity_type: str,
    entity_id,
    actor_id=None,
    payload: dict,
    source: str = 'system',
    dedupe_key: str | None = None,
) -> DomainEvent | None:
    """
    Создаёт DomainEvent и ставит в очередь обработку автоматизаций.
    Безопасен при дублировании (dedupe_key).
    """
    try:
        if dedupe_key and DomainEvent.objects.filter(dedupe_key=dedupe_key).exists():
            logger.debug('DomainEvent skipped (dedupe): %s', dedupe_key)
            return None

        event = DomainEvent.objects.create(
            organization_id=organization_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            source=source,
            payload_json=payload,
            occurred_at=timezone.now(),
            dedupe_key=dedupe_key,
        )

        from apps.automations.tasks import process_domain_event

        process_domain_event.delay(str(event.id))
        return event

    except Exception as exc:
        logger.exception('Failed to publish domain event: %s', exc)
        return None
