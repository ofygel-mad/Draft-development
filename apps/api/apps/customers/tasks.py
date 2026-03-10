from celery import shared_task

@shared_task(queue="default")
def reindex_customer(customer_id: str) -> None:
    return None
