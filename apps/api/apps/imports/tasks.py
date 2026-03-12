import logging

from celery import shared_task
from django.utils import timezone

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

        job.status = ImportJob.Status.COMPLETED
        job.result_json = result
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'result_json', 'finished_at'])

    except ImportJob.DoesNotExist:
        logger.error('ImportJob %s not found', import_job_id)
    except Exception as exc:
        logger.exception('ImportJob %s failed: %s', import_job_id, exc)
        ImportJob.objects.filter(id=import_job_id).update(
            status=ImportJob.Status.FAILED,
            error_message=str(exc),
            result_json={'error': str(exc)},
            finished_at=timezone.now(),
        )
        raise self.retry(exc=exc)


@shared_task
def analyze_import_file(import_job_id: str):
    from apps.imports.models import ImportJob
    from apps.imports.services.file_analyzer import analyze_file

    try:
        job = ImportJob.objects.get(id=import_job_id)
        preview_data = analyze_file(job.file_path, job.import_type)

        job.status = ImportJob.Status.MAPPING_REQUIRED
        job.preview_json = preview_data
        job.save(update_fields=['status', 'preview_json'])

    except Exception as exc:
        logger.exception('Failed to analyze import file for job %s: %s', import_job_id, exc)
        ImportJob.objects.filter(id=import_job_id).update(status=ImportJob.Status.FAILED, error_message=str(exc))
