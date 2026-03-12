import pytest

from apps.spreadsheets.services.sync.run_sync import run_sync


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('conflict_policy', 'expected_status', 'expected_conflicts'),
    [
        ('manual_review', 'partial', 2),
        ('crm_wins', 'completed', 0),
        ('spreadsheet_wins', 'completed', 0),
    ],
)
def test_run_sync_conflict_resolution(org, user, conflict_policy, expected_status, expected_conflicts):
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetMapping

    document = SpreadsheetDocument.objects.create(
        organization_id=org.id,
        title='Sync doc',
        original_filename='sync.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploaded_by_user_id=user.id,
        storage_key='spreadsheets/sync.xlsx',
        status='ready',
    )
    SpreadsheetMapping.objects.create(
        organization_id=org.id,
        document=document,
        sheet_name='Sheet1',
        range_ref='A1:B10',
        entity_type='customer',
        sync_mode='import_only',
        mapping_json={'name': 'full_name'},
    )

    job = run_sync(
        document=document,
        mapping_revision=1,
        conflict_policy=conflict_policy,
        preview_only=False,
        idempotency_key='',
    )

    assert job.status == expected_status
    assert job.direction == 'to_db'
    assert job.totals['conflicts'] == expected_conflicts


@pytest.mark.django_db
def test_run_sync_idempotency_returns_finished_job(org, user):
    from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetMapping

    document = SpreadsheetDocument.objects.create(
        organization_id=org.id,
        title='Sync doc',
        original_filename='sync.xlsx',
        mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploaded_by_user_id=user.id,
        storage_key='spreadsheets/sync.xlsx',
        status='ready',
    )
    SpreadsheetMapping.objects.create(
        organization_id=org.id,
        document=document,
        sheet_name='Sheet1',
        range_ref='A1:B10',
        entity_type='customer',
        sync_mode='import_only',
        mapping_json={'name': 'full_name'},
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
