import logging

from celery import shared_task
from django.db import transaction
from django.db.utils import IntegrityError
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
        executions_to_run = []
        with transaction.atomic():
            # NOTE: `actor` is nullable; joining it with `select_related` while using
            # `select_for_update()` produces a LEFT OUTER JOIN and Postgres raises
            # `FOR UPDATE cannot be applied to the nullable side of an outer join`.
            # Lock only the DomainEvent row and fetch nullable relations lazily.
            event = DomainEvent.objects.select_for_update().select_related('organization').get(id=event_id)
            if event.is_processed:
                return

            rules = list(
                AutomationRule.objects.filter(
                    organization=event.organization,
                    trigger_type=event.event_type,
                    status=AutomationRule.Status.ACTIVE,
                ).prefetch_related('condition_groups__conditions', 'actions')
            )

            context = build_context(event)

            for rule in rules:
                idempotency_key = f'{rule.id}:{event.id}'

                if not evaluate_rule(rule, event, context):
                    continue

                try:
                    execution, created = AutomationExecution.objects.get_or_create(
                        idempotency_key=idempotency_key,
                        defaults={
                            'organization': event.organization,
                            'rule': rule,
                            'event': event,
                            'entity_type': event.entity_type,
                            'entity_id': event.entity_id,
                            'status': 'running',
                            'started_at': timezone.now(),
                        },
                    )
                except IntegrityError:
                    continue

                if not created:
                    continue

                executions_to_run.append((execution.id, rule.id, event.id, context))

            event.is_processed = True
            event.processed_at = timezone.now()
            event.save(update_fields=['is_processed', 'processed_at'])

        for execution_id, rule_id, captured_event_id, captured_context in executions_to_run:
            execution = AutomationExecution.objects.select_related('rule', 'event').get(id=execution_id)
            rule = AutomationRule.objects.get(id=rule_id)
            event = DomainEvent.objects.select_related('organization').get(id=captured_event_id)
            execute_actions(execution, rule, event, captured_context)

    except DomainEvent.DoesNotExist:
        logger.warning('DomainEvent %s not found', event_id)
    except Exception as exc:
        logger.exception('Error processing domain event %s: %s', event_id, exc)
        raise self.retry(exc=exc)


@shared_task
def process_scheduled_automations():
    """
    Запускается каждые 5 минут (celery beat).
    Генерирует domain events для:
      - task.overdue            — задачи с истёкшим due_at
      - deal.stalled            — сделки без активности > 5 дней
      - customer.follow_up_due  — клиенты с follow_up_due_at < now
    """
    from datetime import timedelta

    from django.db.models import Q

    from apps.automations.services.event_publisher import publish_event
    from apps.organizations.models import Organization

    now = timezone.now()
    five_days_ago = now - timedelta(days=5)
    processed = {'overdue_tasks': 0, 'stalled_deals': 0, 'followup_due': 0}

    for org in Organization.objects.filter(is_active=True):
        from apps.tasks.models import Task

        overdue_tasks = Task.objects.filter(
            organization=org,
            status=Task.Status.OPEN,
            due_at__lt=now,
        ).select_related('assigned_to', 'customer', 'deal')[:100]

        for task in overdue_tasks:
            dedupe = f"task.overdue:{task.id}:{now.strftime('%Y-%m-%d-%H')}"
            publish_event(
                organization_id=org.id,
                event_type='task.overdue',
                entity_type='task',
                entity_id=task.id,
                payload={
                    'title': task.title,
                    'priority': task.priority,
                    'due_at': task.due_at.isoformat() if task.due_at else None,
                    'assigned_to': str(task.assigned_to_id) if task.assigned_to_id else None,
                    'customer_id': str(task.customer_id) if task.customer_id else None,
                    'deal_id': str(task.deal_id) if task.deal_id else None,
                },
                dedupe_key=dedupe,
            )
            processed['overdue_tasks'] += 1

        from apps.deals.models import Deal

        stalled = Deal.objects.filter(
            organization=org,
            status=Deal.Status.OPEN,
            deleted_at__isnull=True,
        ).filter(
            Q(last_activity_at__lt=five_days_ago)
            | Q(last_activity_at__isnull=True, created_at__lt=five_days_ago)
        ).select_related('customer', 'owner', 'stage')[:100]

        for deal in stalled:
            days = (now - (deal.last_activity_at or deal.created_at)).days
            dedupe = f"deal.stalled:{deal.id}:{now.strftime('%Y-%m-%d')}"
            publish_event(
                organization_id=org.id,
                event_type='deal.stalled',
                entity_type='deal',
                entity_id=deal.id,
                payload={
                    'title': deal.title,
                    'amount': float(deal.amount or 0),
                    'currency': deal.currency,
                    'stage': deal.stage.name if deal.stage_id else '',
                    'days_silent': days,
                    'owner_id': str(deal.owner_id) if deal.owner_id else None,
                    'customer_id': str(deal.customer_id) if deal.customer_id else None,
                },
                dedupe_key=dedupe,
            )
            processed['stalled_deals'] += 1

        from apps.customers.models import Customer

        followup_due = Customer.objects.filter(
            organization=org,
            deleted_at__isnull=True,
            follow_up_due_at__lt=now,
            follow_up_due_at__isnull=False,
        ).select_related('owner')[:100]

        for customer in followup_due:
            dedupe = f"customer.followup:{customer.id}:{now.strftime('%Y-%m-%d-%H')}"
            publish_event(
                organization_id=org.id,
                event_type='customer.follow_up_due',
                entity_type='customer',
                entity_id=customer.id,
                payload={
                    'full_name': customer.full_name,
                    'phone': customer.phone or '',
                    'follow_up_due_at': customer.follow_up_due_at.isoformat(),
                    'response_state': customer.response_state or '',
                    'owner_id': str(customer.owner_id) if customer.owner_id else None,
                },
                dedupe_key=dedupe,
            )
            processed['followup_due'] += 1

    logger.info('process_scheduled_automations done: %s', processed)
    return processed
