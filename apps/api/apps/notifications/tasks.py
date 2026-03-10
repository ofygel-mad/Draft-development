from celery import shared_task

@shared_task(queue="notifications")
def send_notification(notification_id: str) -> None:
    return None
