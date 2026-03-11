import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, queue="notifications")
def send_notification(self, notification_id: str) -> None:
    from apps.notifications.models import Notification

    try:
        notification = Notification.objects.select_related('recipient').get(id=notification_id)
        from django.core.cache import cache
        idem_key = f'notif_sent:{notification.organization_id}:{notification.recipient_id}:{notification.notification_type}:{notification.entity_id}'
        if cache.get(idem_key):
            return
        cache.set(idem_key, 1, timeout=60)

        recipient_email = notification.recipient.email
        if recipient_email and getattr(settings, 'EMAIL_HOST', None):
            send_mail(
                subject=notification.title,
                message=notification.body or notification.title,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
        logger.info('Notification %s sent to %s', notification_id, recipient_email)
    except Exception as exc:
        logger.error('Failed to send notification %s: %s', notification_id, exc)
        raise self.retry(exc=exc)
