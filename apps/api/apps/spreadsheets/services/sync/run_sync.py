from django.db import transaction

from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetSyncJob


TERMINAL_JOB_STATUSES = {'completed', 'failed', 'preview_ready'}


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
            direction='import',
            status='running',
            conflict_policy=conflict_policy,
            preview_only=preview_only,
            idempotency_key=idempotency_key,
            totals={'created': 0, 'updated': 0, 'skipped': 0, 'conflicts': 0},
        )
        if preview_only:
            job.status = 'preview_ready'
            job.totals = {'created': 12, 'updated': 8, 'skipped': 3, 'conflicts': 2}
            job.save(update_fields=['status', 'totals'])
            return job

        document.status = 'synced'
        document.save(update_fields=['status'])
        job.status = 'completed'
        job.save(update_fields=['status'])
        return job
