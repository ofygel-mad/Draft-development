from io import BytesIO

import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from openpyxl import Workbook

from apps.spreadsheets.services.sync.run_sync import run_sync


def _make_workbook(rows: list[list[str]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = 'Sheet1'
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('conflict_policy', 'expected_status', 'expected_conflicts', 'expected_updated'),
    [
        ('manual_review', 'partial', 1, 0),
        ('crm_wins', 'completed', 0, 0),
        ('spreadsheet_wins', 'completed', 0, 1),
    ],
)
def test_run_sync_conflict_resolution(org, user, conflict_policy, expected_status, expected_conflicts, expected_updated):
    from apps.customers.models import Customer
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetMapping, SpreadsheetVersion

    content = _make_workbook([
        ['name', 'phone', 'email'],
        ['Alice Updated', '+77001234567', 'alice@example.com'],
    ])
    storage_key = f'spreadsheets/{org.id}-sync-conflicts.xlsx'
    default_storage.save(storage_key, ContentFile(content))

    document = SpreadsheetDocument.objects.create(
        organization_id=org.id,
        title='Sync doc',
        original_filename='sync.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploaded_by_user_id=user.id,
        storage_key=storage_key,
        status='ready',
    )
    version = SpreadsheetVersion.objects.create(
        document=document,
        version_number=1,
        storage_key=storage_key,
        created_by_user_id=user.id,
    )
    document.current_version = version
    document.save(update_fields=['current_version'])

    SpreadsheetMapping.objects.create(
        organization_id=org.id,
        document=document,
        sheet_name='Sheet1',
        range_ref='A1:C10',
        entity_type='customer',
        sync_mode='import_only',
        mapping_json={'name': 'full_name', 'phone': 'phone', 'email': 'email'},
    )

    customer = Customer.objects.create(
        organization=org,
        owner=user,
        full_name='Alice',
        phone='+77001234567',
        email='alice@example.com',
    )

    job = run_sync(
        document=document,
        mapping_revision=1,
        conflict_policy=conflict_policy,
        preview_only=False,
        idempotency_key='',
    )

    customer.refresh_from_db()
    assert job.status == expected_status
    assert job.direction == 'to_db'
    assert job.totals['conflicts'] == expected_conflicts
    assert job.totals['updated'] == expected_updated


def test_run_sync_idempotency_returns_finished_job(org, user):
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetMapping, SpreadsheetVersion

    content = _make_workbook([
        ['name', 'phone'],
        ['Bob', '+77001112233'],
    ])
    storage_key = f'spreadsheets/{org.id}-sync-idempotency.xlsx'
    default_storage.save(storage_key, ContentFile(content))

    document = SpreadsheetDocument.objects.create(
        organization_id=org.id,
        title='Sync doc',
        original_filename='sync.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploaded_by_user_id=user.id,
        storage_key=storage_key,
        status='ready',
    )
    version = SpreadsheetVersion.objects.create(
        document=document,
        version_number=1,
        storage_key=storage_key,
        created_by_user_id=user.id,
    )
    document.current_version = version
    document.save(update_fields=['current_version'])

    SpreadsheetMapping.objects.create(
        organization_id=org.id,
        document=document,
        sheet_name='Sheet1',
        range_ref='A1:B10',
        entity_type='customer',
        sync_mode='import_only',
        mapping_json={'name': 'full_name', 'phone': 'phone'},
    )

    first = run_sync(
        document=document,
        mapping_revision=1,
        conflict_policy='crm_wins',
        preview_only=False,
        idempotency_key='k1',
    )
    second = run_sync(
        document=document,
        mapping_revision=1,
        conflict_policy='crm_wins',
        preview_only=False,
        idempotency_key='k1',
    )

    assert first.id == second.id
