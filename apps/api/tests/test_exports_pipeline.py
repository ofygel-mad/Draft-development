from pathlib import Path

import pytest
from django.test import override_settings

from apps.exports.tasks import process_export


@pytest.mark.django_db
def test_process_export_missing_job_is_noop():
    process_export.run('00000000-0000-0000-0000-000000000000')


@pytest.mark.django_db
def test_process_export_fails_with_unsupported_format(tmp_path, org, user):
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetExportJob, SpreadsheetVersion

    source_rel = 'spreadsheets/source.xlsx'
    source_abs = tmp_path / source_rel
    source_abs.parent.mkdir(parents=True, exist_ok=True)
    source_abs.write_bytes(b'dummy')

    with override_settings(MEDIA_ROOT=str(tmp_path)):
        document = SpreadsheetDocument.objects.create(
            organization_id=org.id,
            title='Export doc',
            original_filename='source.xlsx',
            mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            uploaded_by_user_id=user.id,
            storage_key=source_rel,
            status='ready',
        )
        version = SpreadsheetVersion.objects.create(
            document=document,
            version_number=1,
            source_type='uploaded',
            storage_key=source_rel,
            created_by_user_id=user.id,
        )
        job = SpreadsheetExportJob.objects.create(
            organization_id=org.id,
            document=document,
            version=version,
            status='pending',
            summary_json={'format': 'pdf'},
            created_by_user_id=user.id,
        )

        with pytest.raises(ValueError, match='Unsupported export format'):
            process_export.run(str(job.id))

        job.refresh_from_db()
        assert job.status == 'failed'
        assert 'Unsupported export format' in job.error_text


@pytest.mark.django_db
def test_process_export_generates_csv(tmp_path, org, user):
    from openpyxl import Workbook

    from apps.audit.models import AuditLog
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetExportJob, SpreadsheetVersion

    source_rel = 'spreadsheets/source.xlsx'
    source_abs = tmp_path / source_rel
    source_abs.parent.mkdir(parents=True, exist_ok=True)

    workbook = Workbook()
    ws = workbook.active
    ws.append(['name', 'value'])
    ws.append(['A', 10])
    workbook.save(source_abs)
    workbook.close()

    with override_settings(MEDIA_ROOT=str(tmp_path)):
        document = SpreadsheetDocument.objects.create(
            organization_id=org.id,
            title='Export doc',
            original_filename='source.xlsx',
            mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            uploaded_by_user_id=user.id,
            storage_key=source_rel,
            status='ready',
        )
        version = SpreadsheetVersion.objects.create(
            document=document,
            version_number=1,
            source_type='uploaded',
            storage_key=source_rel,
            created_by_user_id=user.id,
        )
        job = SpreadsheetExportJob.objects.create(
            organization_id=org.id,
            document=document,
            version=version,
            status='pending',
            summary_json={'format': 'csv'},
            created_by_user_id=user.id,
        )

        process_export.run(str(job.id))

        job.refresh_from_db()
        assert job.status == 'completed'
        output_path = tmp_path / Path(job.output_storage_key)
        assert output_path.exists()
        content = output_path.read_text(encoding='utf-8')
        assert 'name,value' in content
        assert 'A,10' in content
        assert AuditLog.objects.filter(entity_id=job.id, action='export').exists()
