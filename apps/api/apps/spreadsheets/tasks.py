from celery import shared_task
from django.db import transaction

from apps.spreadsheets.domain import SpreadsheetDocumentStatus
from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetVersion
from apps.spreadsheets.parsers.workbook_loader import load_workbook_from_storage
from apps.spreadsheets.services.analysis.analyze_workbook import analyze_workbook


@shared_task(queue="spreadsheets")
def analyze_spreadsheet_version(version_id: str) -> None:
    version = SpreadsheetVersion.objects.select_related("document").get(id=version_id)
    try:
        workbook = load_workbook_from_storage(version.storage_key)
        try:
            with transaction.atomic():
                analyze_workbook(version=version, workbook=workbook)
        finally:
            workbook.close()
    except Exception as exc:  # noqa: BLE001
        SpreadsheetDocument.objects.filter(id=version.document_id).update(status=SpreadsheetDocumentStatus.SYNC_ERROR)
        raise exc


@shared_task(queue="spreadsheets")
def sync_spreadsheet_job(sync_job_id: str) -> None:
    return None
