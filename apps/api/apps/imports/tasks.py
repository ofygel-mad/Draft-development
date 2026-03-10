from celery import shared_task

@shared_task(queue="imports")
def process_import(import_job_id: str) -> None:
    return None
