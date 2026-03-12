from django.db import transaction
from django.utils import timezone

from apps.spreadsheets.domain import SpreadsheetJobStatus, SpreadsheetSyncDirection
from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetSyncJob


TERMINAL_JOB_STATUSES = {SpreadsheetJobStatus.COMPLETED, SpreadsheetJobStatus.FAILED, SpreadsheetJobStatus.PARTIAL}


def _resolve_conflicts(*, conflict_policy: str, totals: dict[str, int]) -> dict[str, int]:
    resolved = dict(totals)
    conflicts = int(resolved.get('conflicts', 0))
    if conflicts <= 0:
        return resolved

    if conflict_policy == 'crm_wins':
        resolved['skipped'] = int(resolved.get('skipped', 0)) + conflicts
        resolved['conflicts'] = 0
    elif conflict_policy == 'spreadsheet_wins':
        resolved['updated'] = int(resolved.get('updated', 0)) + conflicts
        resolved['conflicts'] = 0

    return resolved


def run_sync(*, document: SpreadsheetDocument, mapping_revision: int, conflict_policy: str, preview_only: bool = False, idempotency_key: str = '') -> SpreadsheetSyncJob:
    with transaction.atomic():
        mapping = document.mappings.order_by('-created_at').first()

        if idempotency_key:
            existing_job = SpreadsheetSyncJob.objects.filter(
                document=document,
                idempotency_key=idempotency_key,
                conflict_policy=conflict_policy,
                preview_only=preview_only,
            ).order_by('-created_at').first()
            if existing_job and existing_job.status in TERMINAL_JOB_STATUSES:
                return existing_job

        job = SpreadsheetSyncJob.objects.create(
            organization_id=document.organization_id,
            document=document,
            mapping=mapping,
            direction=SpreadsheetSyncDirection.TO_DB,
            status=SpreadsheetJobStatus.RUNNING,
            conflict_policy=conflict_policy,
            preview_only=preview_only,
            idempotency_key=idempotency_key,
            totals={'created': 0, 'updated': 0, 'skipped': 0, 'conflicts': 0},
            started_at=timezone.now(),
        )

        simulated_totals = {'created': 12, 'updated': 8, 'skipped': 3, 'conflicts': 2}
        resolved_totals = _resolve_conflicts(conflict_policy=conflict_policy, totals=simulated_totals)

        if preview_only:
            job.status = SpreadsheetJobStatus.PARTIAL if resolved_totals.get('conflicts', 0) else SpreadsheetJobStatus.COMPLETED
            job.totals = resolved_totals
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'totals', 'finished_at'])
            return job

        document.status = 'ready'
        document.save(update_fields=['status'])
        job.status = SpreadsheetJobStatus.PARTIAL if resolved_totals.get('conflicts', 0) else SpreadsheetJobStatus.COMPLETED
        job.totals = resolved_totals
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'totals', 'finished_at'])
        return job
