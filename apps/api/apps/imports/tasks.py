import logging

from celery import shared_task
from django.utils import timezone

from apps.imports.services.state_machine import (
    InvalidImportTransitionError,
    transition_job,
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def process_import_job(self, import_job_id: str):
    from apps.imports.models import ImportJob
    from apps.imports.services.processor import ImportProcessor

    try:
        job = ImportJob.objects.select_related('organization', 'created_by').get(id=import_job_id)

        if job.status != ImportJob.Status.PROCESSING:
            logger.warning('ImportJob %s in wrong status: %s', import_job_id, job.status)
            return

        processor = ImportProcessor(job)
        result = processor.run()

        job.result_json = result
        job.finished_at = timezone.now()
        transition_job(
            job=job,
            next_status=ImportJob.Status.COMPLETED,
            update_fields=['result_json', 'finished_at'],
        )

    except ImportJob.DoesNotExist:
        logger.error('ImportJob %s not found', import_job_id)
    except Exception as exc:
        logger.exception('ImportJob %s failed: %s', import_job_id, exc)
        job = ImportJob.objects.filter(id=import_job_id).first()
        if job:
            job.error_message = str(exc)
            job.result_json = {'error': str(exc)}
            job.finished_at = timezone.now()
            try:
                transition_job(
                    job=job,
                    next_status=ImportJob.Status.FAILED,
                    update_fields=['error_message', 'result_json', 'finished_at'],
                )
            except InvalidImportTransitionError:
                logger.warning('Cannot mark job %s as failed from status %s', import_job_id, job.status)
        raise self.retry(exc=exc)


@shared_task
def analyze_import_file(import_job_id: str):
    from apps.imports.models import ImportJob
    from apps.imports.services.file_analyzer import analyze_file

    try:
        job = ImportJob.objects.get(id=import_job_id)
        preview_data = analyze_file(job.file_path, job.import_type)

        job.preview_json = preview_data
        transition_job(
            job=job,
            next_status=ImportJob.Status.MAPPING_REQUIRED,
            update_fields=['preview_json'],
        )

    except Exception as exc:
        logger.exception('Failed to analyze import file for job %s: %s', import_job_id, exc)
        job = ImportJob.objects.filter(id=import_job_id).first()
        if job:
            job.error_message = str(exc)
            try:
                transition_job(
                    job=job,
                    next_status=ImportJob.Status.FAILED,
                    update_fields=['error_message'],
                )
            except InvalidImportTransitionError:
                logger.warning('Cannot mark analyzed job %s as failed from status %s', import_job_id, job.status)
