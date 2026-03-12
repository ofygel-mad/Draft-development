"""
Выполняет действия AutomationRule после успешной оценки условий.

Поддерживаемые action_type:
  create_task       — создаёт задачу для customer/deal
  create_note       — создаёт заметку
  send_notification — отправляет уведомление пользователю
  update_field      — обновляет поле объекта
  change_deal_stage — переводит сделку на другую стадию
  webhook           — HTTP POST на внешний URL
"""
from __future__ import annotations
import logging
import ipaddress
import socket
from urllib.parse import urlparse
from django.utils import timezone

from apps.automations.models import AutomationExecution, AutomationAction, AutomationExecutionAction

logger = logging.getLogger(__name__)


def _validate_webhook_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {'http', 'https'}:
        raise ValueError('webhook: only http/https urls are allowed')
    if not parsed.hostname:
        raise ValueError('webhook: hostname is required')

    try:
        addr_info = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ValueError(f'webhook: cannot resolve host: {exc}')

    for info in addr_info:
        raw_ip = info[4][0]
        ip = ipaddress.ip_address(raw_ip)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError('webhook: internal or non-routable hosts are not allowed')

    return url


def execute_actions(
    execution: AutomationExecution,
    rule,
    event,
    context: dict,
) -> None:
    actions = list(rule.actions.order_by('position'))

    success_count = 0
    fail_count = 0

    for action in actions:
        log = AutomationExecutionAction.objects.create(
            execution=execution,
            action=action,
            action_type=action.action_type,
            status=AutomationExecutionAction.Status.PENDING,
            started_at=timezone.now(),
        )
        try:
            result = _dispatch(action, execution, event, context)
            log.status = AutomationExecutionAction.Status.COMPLETED
            log.result_json = result or {}
            success_count += 1
        except Exception as exc:
            logger.exception('Action %s failed: %s', action.action_type, exc)
            log.status = AutomationExecutionAction.Status.FAILED
            log.error_text = str(exc)
            fail_count += 1
        finally:
            log.finished_at = timezone.now()
            log.save(update_fields=['status', 'result_json', 'error_text', 'finished_at'])

    # Update execution status
    if fail_count == 0:
        execution.status = AutomationExecution.Status.COMPLETED
    elif success_count == 0:
        execution.status = AutomationExecution.Status.FAILED
    else:
        execution.status = AutomationExecution.Status.PARTIAL

    execution.finished_at = timezone.now()
    execution.save(update_fields=['status', 'finished_at'])


def _dispatch(action: AutomationAction, execution: AutomationExecution, event, context: dict) -> dict:
    cfg = action.config_json or {}
    t = action.action_type

    if t == 'create_task':
        return _action_create_task(cfg, execution, event, context)
    if t == 'create_note':
        return _action_create_note(cfg, execution, event, context)
    if t == 'send_notification':
        return _action_send_notification(cfg, execution, event, context)
    if t == 'update_field':
        return _action_update_field(cfg, execution, event, context)
    if t == 'change_deal_stage':
        return _action_change_deal_stage(cfg, execution, event, context)
    if t == 'webhook':
        return _action_webhook(cfg, execution, event, context)

    raise ValueError(f'Unknown action_type: {t}')


def _render(template: str, context: dict) -> str:
    """Простая шаблонизация {{key}} → value из context (плоская проекция)."""
    import re
    flat = {}
    for section, data in context.items():
        if isinstance(data, dict):
            for k, v in data.items():
                flat[f'{section}.{k}'] = str(v) if v is not None else ''
                flat[k] = str(v) if v is not None else ''

    def replacer(m):
        key = m.group(1).strip()
        return flat.get(key, m.group(0))

    return re.sub(r'\{\{(.+?)\}\}', replacer, template)


def _get_entity_ids(event, context) -> tuple:
    """Возвращает (customer_id, deal_id) из контекста."""
    entity = context.get('entity', {})
    customer_id = None
    deal_id = None

    if event.entity_type == 'customer':
        customer_id = event.entity_id
    elif event.entity_type == 'deal':
        deal_id = event.entity_id
        customer_id = entity.get('customer_id')

    return customer_id, deal_id


def _action_create_task(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    from apps.tasks.models import Task
    from apps.users.models import User

    title = _render(cfg.get('title', 'Автоматическая задача'), context)
    description = _render(cfg.get('description', ''), context)
    priority = cfg.get('priority', 'medium')
    due_days = cfg.get('due_in_days')

    due_at = None
    if due_days is not None:
        from datetime import timedelta
        due_at = timezone.now() + timedelta(days=int(due_days))

    assigned_to = None
    assign_to = cfg.get('assign_to')  # 'owner' | user_id
    entity = context.get('entity', {})
    if assign_to == 'owner' and entity.get('owner_id'):
        try:
            assigned_to = User.objects.get(id=entity['owner_id'])
        except User.DoesNotExist:
            pass
    elif assign_to and assign_to != 'owner':
        try:
            assigned_to = User.objects.get(id=assign_to, organization=execution.organization)
        except User.DoesNotExist:
            pass

    customer_id, deal_id = _get_entity_ids(event, context)

    task = Task.objects.create(
        organization=execution.organization,
        title=title,
        description=description,
        priority=priority,
        due_at=due_at,
        assigned_to=assigned_to,
        customer_id=customer_id,
        deal_id=deal_id,
        created_by=None,
    )

    # Activity log
    from apps.activities.models import Activity
    Activity.objects.create(
        organization=execution.organization,
        customer_id=customer_id,
        deal_id=deal_id,
        type=Activity.Type.TASK_CREATED,
        payload={'task_id': str(task.id), 'title': title, 'automation': True},
    )

    return {'task_id': str(task.id)}


def _action_create_note(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    from apps.activities.models import Activity, Note

    body = _render(cfg.get('body', ''), context)
    if not body:
        raise ValueError('Note body is empty')

    customer_id, deal_id = _get_entity_ids(event, context)

    note = Note.objects.create(
        organization=execution.organization,
        author=None,
        body=body,
        customer_id=customer_id,
        deal_id=deal_id,
    )
    Activity.objects.create(
        organization=execution.organization,
        customer_id=customer_id,
        deal_id=deal_id,
        type=Activity.Type.NOTE,
        payload={'body': body, 'note_id': str(note.id), 'automation': True},
    )
    return {'note_id': str(note.id)}


def _action_send_notification(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    from apps.notifications.models import Notification

    title = _render(cfg.get('title', 'Уведомление'), context)
    body = _render(cfg.get('body', ''), context)

    recipient_ids = cfg.get('recipient_ids', [])
    if not recipient_ids:
        # Уведомить владельца объекта
        owner_id = context.get('entity', {}).get('owner_id')
        if owner_id:
            recipient_ids = [owner_id]

    notifs = []
    for uid in recipient_ids:
        try:
            n = Notification.objects.create(
                organization=execution.organization,
                recipient_id=uid,
                title=title,
                body=body,
                notification_type='automation',
                entity_type=event.entity_type,
                entity_id=event.entity_id,
            )
            notifs.append(str(n.id))
        except Exception as exc:
            logger.warning('Could not create notification for %s: %s', uid, exc)

    return {'notification_ids': notifs}


def _action_update_field(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    field = cfg.get('field')
    value = cfg.get('value')
    if not field:
        raise ValueError('update_field: field is required')

    entity_type = event.entity_type
    entity_id = event.entity_id
    ALLOWED = {
        'customer': ['status', 'source', 'owner_id'],
        'deal': ['status', 'owner_id'],
        'task': ['priority', 'status', 'assigned_to_id'],
    }

    if field not in ALLOWED.get(entity_type, []):
        raise ValueError(f'update_field: field {field!r} not allowed for {entity_type}')

    if entity_type == 'customer':
        from apps.customers.models import Customer
        Customer.objects.filter(id=entity_id, organization=execution.organization).update(**{field: value})
    elif entity_type == 'deal':
        from apps.deals.models import Deal
        Deal.objects.filter(id=entity_id, organization=execution.organization).update(**{field: value})
    elif entity_type == 'task':
        from apps.tasks.models import Task
        Task.objects.filter(id=entity_id, organization=execution.organization).update(**{field: value})

    return {'field': field, 'value': value}


def _action_change_deal_stage(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    stage_id = cfg.get('stage_id')
    if not stage_id:
        raise ValueError('change_deal_stage: stage_id required')

    deal_id = event.entity_id if event.entity_type == 'deal' else None
    if not deal_id:
        deal_id = context.get('entity', {}).get('id')
    if not deal_id:
        raise ValueError('change_deal_stage: no deal in context')

    from apps.deals.models import Deal
    from apps.pipelines.models import PipelineStage
    from django.db import transaction

    with transaction.atomic():
        deal = Deal.objects.get(id=deal_id, organization=execution.organization)
        new_stage = PipelineStage.objects.get(id=stage_id, pipeline=deal.pipeline)
        old_stage_name = deal.stage.name if deal.stage_id else ''
        deal.stage = new_stage
        if new_stage.stage_type == 'won':
            deal.status = Deal.Status.WON
            deal.closed_at = timezone.now()
        elif new_stage.stage_type == 'lost':
            deal.status = Deal.Status.LOST
            deal.closed_at = timezone.now()
        deal.save()

        from apps.activities.models import Activity
        Activity.objects.create(
            organization=execution.organization,
            deal=deal,
            customer_id=deal.customer_id,
            type=Activity.Type.STAGE_CHANGE,
            payload={
                'old_stage': old_stage_name,
                'new_stage': new_stage.name,
                'automation': True,
            },
        )

    return {'deal_id': str(deal_id), 'new_stage': new_stage.name}


def _action_webhook(cfg: dict, execution: AutomationExecution, event, context: dict) -> dict:
    import requests

    url = cfg.get('url')
    if not url:
        raise ValueError('webhook: url required')
    url = _validate_webhook_url(url)

    headers = cfg.get('headers', {})
    headers.setdefault('Content-Type', 'application/json')
    headers.setdefault('X-CRM-Event', event.event_type)

    payload = {
        'event_type': event.event_type,
        'entity_type': event.entity_type,
        'entity_id': str(event.entity_id),
        'organization_id': str(event.organization_id),
        'occurred_at': event.occurred_at.isoformat(),
        'payload': event.payload_json,
        'context': {k: v for k, v in context.items() if k != 'organization'},
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        status = response.status_code
    except requests.RequestException as exc:
        raise ValueError(f'Webhook failed: {exc}')

    return {'url': url, 'status_code': status}
