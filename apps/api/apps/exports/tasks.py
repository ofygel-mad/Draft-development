import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="exports")
def process_export(export_job_id: str) -> None:
    # TODO: реализовать генерацию файла экспорта
    logger.warning(
        'process_export called but not implemented yet. export_job_id=%s',
        export_job_id,
    )
    raise NotImplementedError(
        f'Export job {export_job_id} cannot be processed: task not implemented'
    )
