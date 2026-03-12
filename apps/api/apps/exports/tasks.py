import logging
from pathlib import Path
import csv

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.spreadsheets.domain import SpreadsheetJobStatus
from apps.spreadsheets.models import SpreadsheetExportJob

try:
    from openpyxl import load_workbook
except Exception:  # pragma: no cover
    load_workbook = None

logger = logging.getLogger(__name__)


@shared_task(queue='exports', bind=True, max_retries=3)
def process_export(self, export_job_id: str) -> None:
    try:
        job = SpreadsheetExportJob.objects.select_related('document', 'version').get(id=export_job_id)
    except SpreadsheetExportJob.DoesNotExist:
        logger.warning('process_export: job not found export_job_id=%s', export_job_id)
        return

    if job.status in {SpreadsheetJobStatus.COMPLETED, SpreadsheetJobStatus.FAILED}:
        logger.info('process_export: skip terminal job export_job_id=%s status=%s', export_job_id, job.status)
        return

    now = timezone.now()
    SpreadsheetExportJob.objects.filter(id=job.id).update(
        status=SpreadsheetJobStatus.RUNNING,
        started_at=job.started_at or now,
        error_text='',
    )

    try:
        source_key = (job.version.storage_key if job.version_id else job.document.storage_key).strip()
        source_path = Path(source_key)
        if not source_path.is_absolute():
            source_path = Path(settings.MEDIA_ROOT) / source_key
        if not source_path.exists():
            raise FileNotFoundError(f'Source file not found: {source_path}')

        export_format = str(job.summary_json.get('format') or source_path.suffix.lstrip('.') or 'xlsx').lower()
        if export_format not in {'csv', 'xlsx'}:
            raise ValueError(f'Unsupported export format: {export_format}')

        out_rel = Path('exports') / str(job.organization_id) / f'{job.id}.{export_format}'
        out_abs = Path(settings.MEDIA_ROOT) / out_rel
        out_abs.parent.mkdir(parents=True, exist_ok=True)

        if export_format == 'xlsx':
            out_abs.write_bytes(source_path.read_bytes())
        else:
            if source_path.suffix.lower() == '.csv':
                out_abs.write_bytes(source_path.read_bytes())
            else:
                if load_workbook is None:
                    raise RuntimeError('openpyxl is not available for xlsx->csv export')
                workbook = load_workbook(filename=str(source_path), data_only=True, read_only=True)
                try:
                    worksheet = workbook.worksheets[0]
                    with out_abs.open('w', newline='', encoding='utf-8') as csv_file:
                        writer = csv.writer(csv_file)
                        for row in worksheet.iter_rows(values_only=True):
                            writer.writerow(['' if value is None else value for value in row])
                finally:
                    workbook.close()

        summary = {
            **(job.summary_json or {}),
            'format': export_format,
            'bytes': out_abs.stat().st_size,
            'source_storage_key': source_key,
        }
        SpreadsheetExportJob.objects.filter(id=job.id).update(
            status=SpreadsheetJobStatus.COMPLETED,
            output_storage_key=str(out_rel),
            summary_json=summary,
            finished_at=timezone.now(),
            error_text='',
        )
        log_action(
            organization_id=job.organization_id,
            actor_id=job.created_by_user_id,
            action=AuditLog.Action.EXPORT,
            entity_type='spreadsheet_export_job',
            entity_id=job.id,
            entity_label=job.document.title,
            diff={'status': SpreadsheetJobStatus.COMPLETED, 'output_storage_key': str(out_rel)},
        )
    except Exception as exc:  # noqa: BLE001
        SpreadsheetExportJob.objects.filter(id=job.id).update(
            status=SpreadsheetJobStatus.FAILED,
            error_text=str(exc)[:4000],
            finished_at=timezone.now(),
        )
        logger.exception('process_export failed export_job_id=%s: %s', export_job_id, exc)
        raise
