from __future__ import annotations

import logging

from django.db import IntegrityError, transaction
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
) -> DomainEvent:
    """
    Создаёт DomainEvent и ставит в очередь обработку автоматизаций.
    Безопасен при дублировании (dedupe_key).
    """
    try:
        with transaction.atomic():
            try:
                # Use a nested atomic() to create a savepoint.
                # If the INSERT races another thread and hits a UniqueViolation,
                # Django rolls back only the savepoint — the outer transaction
                # stays clean so the subsequent SELECT can still execute.
                with transaction.atomic():
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
            except IntegrityError:
                if not dedupe_key:
                    raise
                logger.debug('DomainEvent skipped (dedupe): %s', dedupe_key)
                event = DomainEvent.objects.get(dedupe_key=dedupe_key)
                return event

        from apps.automations.tasks import process_domain_event

        process_domain_event.delay(str(event.id))

        try:
            from apps.webhooks.tasks import dispatch_webhooks

            dispatch_webhooks(
                organization_id=str(organization_id),
                event_type=event_type,
                payload={
                    'event': event_type,
                    'entity_type': entity_type,
                    'entity_id': str(entity_id),
                    'actor_id': str(actor_id) if actor_id else None,
                    'occurred_at': event.occurred_at.isoformat(),
                    'data': payload,
                },
            )
        except Exception as exc:
            logger.error('Webhook dispatch failed for event %s: %s', event.id, exc, exc_info=True)
            raise

        return event

    except Exception as exc:
        logger.error('Failed to publish domain event: %s', exc, exc_info=True)
        raise
