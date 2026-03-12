"""Хелпер для записи аудит-лога. Вызывай из viewsets и сервисов."""
from __future__ import annotations

import logging

from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)


def log_action(
    *,
    organization_id,
    actor_id=None,
    action: str,
    entity_type: str,
    entity_id=None,
    entity_label: str = '',
    diff: dict | None = None,
    request=None,
) -> AuditLog | None:
    try:
        _valid = {c.value for c in AuditLog.Action}
        if action not in _valid:
            logger.warning('audit: invalid action %r — falling back to update', action)
            action = 'update'

        ip = None
        ua = ''
        if request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', '')[:512]

        return AuditLog.objects.create(
            organization_id=organization_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            diff=diff,
            ip_address=ip,
            user_agent=ua,
        )
    except Exception as exc:
        logger.exception('audit log failed: %s', exc)
        return None
