import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

MAX_EXECUTION_DEPTH = 3


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_domain_event(self, event_id: str):
    """Обрабатывает domain event: матчит правила и запускает executions."""
    from apps.automations.models import AutomationExecution, AutomationRule, DomainEvent
    from apps.automations.services.action_executor import execute_actions
    from apps.automations.services.condition_evaluator import evaluate_rule
    from apps.automations.services.context_builder import build_context

    try:
        event = DomainEvent.objects.select_related('organization', 'actor').get(id=event_id)
        if event.is_processed:
            return

        rules = AutomationRule.objects.filter(
            organization=event.organization,
            trigger_type=event.event_type,
            status=AutomationRule.Status.ACTIVE,
        ).prefetch_related('condition_groups__conditions', 'actions')

        context = build_context(event)

        for rule in rules:
            idempotency_key = f'{rule.id}:{event.id}'

            if AutomationExecution.objects.filter(idempotency_key=idempotency_key).exists():
                continue

            if not evaluate_rule(rule, event, context):
                continue

            execution = AutomationExecution.objects.create(
                organization=event.organization,
                rule=rule,
                event=event,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                idempotency_key=idempotency_key,
                status='running',
                started_at=timezone.now(),
            )

            execute_actions(execution, rule, event, context)

        event.is_processed = True
        event.processed_at = timezone.now()
        event.save(update_fields=['is_processed', 'processed_at'])

    except DomainEvent.DoesNotExist:
        logger.warning('DomainEvent %s not found', event_id)
    except Exception as exc:
        logger.exception('Error processing domain event %s: %s', event_id, exc)
        raise self.retry(exc=exc)


@shared_task
def process_scheduled_automations():
    """Периодически запускается для time-based automations."""
    # TODO: implement time-based triggers
    return None
