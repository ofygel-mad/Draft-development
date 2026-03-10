from dataclasses import dataclass
from uuid import UUID

from django.db import transaction

from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetVersion
from apps.spreadsheets.tasks import analyze_spreadsheet_version


@dataclass(frozen=True)
class UploadedSpreadsheet:
    document: SpreadsheetDocument
    version: SpreadsheetVersion


@transaction.atomic
def upload_workbook(*, organization_id: UUID, uploaded_by_user_id: UUID, title: str, filename: str, mime_type: str, storage_key: str) -> UploadedSpreadsheet:
    document = SpreadsheetDocument.objects.create(
        organization_id=organization_id,
        title=title,
        original_filename=filename,
        mime_type=mime_type,
        uploaded_by_user_id=uploaded_by_user_id,
        storage_key=storage_key,
        status=SpreadsheetDocument.Status.ANALYZING,
    )
    version = SpreadsheetVersion.objects.create(
        document=document,
        version_number=1,
        source_type=SpreadsheetVersion.SourceType.UPLOADED,
        storage_key=storage_key,
        created_by_user_id=uploaded_by_user_id,
    )
    document.current_version = version
    document.save(update_fields=["current_version", "updated_at"])

    analyze_spreadsheet_version.delay(str(version.id))
    return UploadedSpreadsheet(document=document, version=version)
