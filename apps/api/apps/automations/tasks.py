from celery import shared_task

@shared_task(queue="automations")
def process_domain_event(event_id: str) -> None:
    return None
