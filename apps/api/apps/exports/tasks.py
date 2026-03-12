import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue='exports', bind=True, max_retries=3)
def process_export(self, export_job_id: str) -> None:
    """
    FIXME: тело задачи не реализовано.
    Задача зарегистрирована чтобы не терять jobs в очереди.
    """
    logger.error(
        'process_export: NOT IMPLEMENTED. export_job_id=%s',
        export_job_id,
    )
    raise NotImplementedError(
        f'Export job {export_job_id}: task body not implemented. See exports/tasks.py'
    )
