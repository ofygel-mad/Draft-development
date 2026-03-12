from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from apps.core.services import ensure_default_pipeline
from apps.customers.models import Customer
from apps.deals.models import Deal
from apps.organizations.models import Organization
from apps.spreadsheets.domain import SpreadsheetJobStatus, SpreadsheetMappingEntityType, SpreadsheetSyncDirection
from apps.spreadsheets.models import SpreadsheetDocument, SpreadsheetSyncJob
from apps.spreadsheets.parsers.workbook_loader import load_workbook_from_storage
from apps.users.models import User

TERMINAL_JOB_STATUSES = {SpreadsheetJobStatus.COMPLETED, SpreadsheetJobStatus.FAILED, SpreadsheetJobStatus.PARTIAL}


def _parse_decimal(value) -> Decimal | None:
    if value is None:
        return None
    text = str(value).strip().replace(' ', '').replace(',', '.')
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _row_to_data(headers: list[str], row: tuple, mapping_json: dict) -> dict[str, str]:
    by_header = {str(h).strip(): ('' if idx >= len(row) or row[idx] is None else str(row[idx]).strip()) for idx, h in enumerate(headers)}
    data: dict[str, str] = {}
    for source_key, target_field in (mapping_json or {}).items():
        if not target_field:
            continue
        raw = by_header.get(str(source_key).strip(), '')
        if raw:
            data[str(target_field).strip()] = raw
    return data


def _resolve_customer_conflict(existing: Customer, incoming: dict, conflict_policy: str, *, apply_changes: bool) -> str:
    mutable_fields = ('full_name', 'company_name', 'email', 'phone', 'source', 'status', 'notes')
    changed_fields = [f for f in mutable_fields if f in incoming and str(getattr(existing, f, '') or '') != str(incoming[f] or '')]
    if not changed_fields:
        return 'skipped'

    if conflict_policy == 'manual_review':
        return 'conflicts'
    if conflict_policy == 'crm_wins':
        return 'skipped'

    if apply_changes:
        for field in changed_fields:
            setattr(existing, field, incoming[field])
        existing.save(update_fields=changed_fields + ['updated_at'])
    return 'updated'


def _resolve_deal_conflict(existing: Deal, incoming: dict, conflict_policy: str, *, apply_changes: bool) -> str:
    mutable_fields = ('title', 'amount', 'currency', 'status', 'next_step')
    changed_fields = [f for f in mutable_fields if f in incoming and str(getattr(existing, f, '') or '') != str(incoming[f] or '')]
    if not changed_fields:
        return 'skipped'

    if conflict_policy == 'manual_review':
        return 'conflicts'
    if conflict_policy == 'crm_wins':
        return 'skipped'

    if apply_changes:
        for field in changed_fields:
            setattr(existing, field, incoming[field])
        existing.save(update_fields=changed_fields + ['updated_at'])
    return 'updated'


def run_sync(*, document: SpreadsheetDocument, mapping_revision: int, conflict_policy: str, preview_only: bool = False, idempotency_key: str = '') -> SpreadsheetSyncJob:
    with transaction.atomic():
        document = SpreadsheetDocument.objects.select_for_update().get(id=document.id)
        mapping = document.mappings.filter(is_active=True).order_by('-created_at').first()

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

        totals = {'created': 0, 'updated': 0, 'skipped': 0, 'conflicts': 0}
        if not mapping:
            job.status = SpreadsheetJobStatus.FAILED
            job.totals = totals
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'totals', 'finished_at'])
            return job

        workbook = load_workbook_from_storage(document.current_version.storage_key if document.current_version_id else document.storage_key)
        try:
            if mapping.sheet_name not in workbook.sheetnames:
                job.status = SpreadsheetJobStatus.FAILED
                job.finished_at = timezone.now()
                job.save(update_fields=['status', 'finished_at'])
                return job

            sheet = workbook[mapping.sheet_name]
            all_rows = list(sheet.iter_rows(values_only=True))
            if not all_rows:
                job.status = SpreadsheetJobStatus.COMPLETED
                job.totals = totals
                job.finished_at = timezone.now()
                job.save(update_fields=['status', 'totals', 'finished_at'])
                return job

            headers = [str(v).strip() if v is not None else '' for v in all_rows[0]]
            data_rows = all_rows[1:]
            org = Organization.objects.get(id=document.organization_id)
            owner = User.objects.filter(id=document.uploaded_by_user_id).first()
            default_pipeline = ensure_default_pipeline(org)
            default_stage = default_pipeline.stages.order_by('position').first()

            for row in data_rows:
                data = _row_to_data(headers, row, mapping.mapping_json)
                if not data:
                    totals['skipped'] += 1
                    continue

                if mapping.entity_type == SpreadsheetMappingEntityType.CUSTOMER:
                    phone = data.get('phone', '').strip()
                    email = data.get('email', '').strip()
                    existing = None
                    if phone:
                        existing = Customer.objects.filter(organization=org, phone=phone, deleted_at__isnull=True).first()
                    elif email:
                        existing = Customer.objects.filter(organization=org, email=email, deleted_at__isnull=True).first()

                    if existing:
                        bucket = _resolve_customer_conflict(existing, data, conflict_policy, apply_changes=not preview_only)
                        totals[bucket] += 1
                    else:
                        if not data.get('full_name') and not phone and not email:
                            totals['skipped'] += 1
                            continue
                        if not preview_only:
                            Customer.objects.create(
                                organization=org,
                                owner=owner,
                                full_name=data.get('full_name') or phone or email or 'Imported Customer',
                                company_name=data.get('company_name', ''),
                                phone=phone,
                                email=email,
                                source=data.get('source', 'spreadsheet_sync'),
                                status=data.get('status', Customer.Status.NEW),
                                notes=data.get('notes', ''),
                            )
                        totals['created'] += 1

                elif mapping.entity_type == SpreadsheetMappingEntityType.DEAL:
                    title = data.get('title', '').strip()
                    if not title:
                        totals['skipped'] += 1
                        continue

                    customer = None
                    customer_phone = data.get('customer_phone', '').strip()
                    customer_email = data.get('customer_email', '').strip()
                    if customer_phone:
                        customer = Customer.objects.filter(organization=org, phone=customer_phone, deleted_at__isnull=True).first()
                    elif customer_email:
                        customer = Customer.objects.filter(organization=org, email=customer_email, deleted_at__isnull=True).first()
                    elif data.get('customer_name'):
                        customer = Customer.objects.filter(organization=org, full_name=data['customer_name'], deleted_at__isnull=True).first()

                    if not customer:
                        totals['conflicts'] += 1
                        continue

                    incoming = {
                        'title': title,
                        'amount': _parse_decimal(data.get('amount')),
                        'currency': data.get('currency', 'KZT'),
                        'status': data.get('status', Deal.Status.OPEN),
                        'next_step': data.get('next_step', ''),
                    }

                    existing = Deal.objects.filter(
                        organization=org,
                        customer=customer,
                        title=title,
                        deleted_at__isnull=True,
                    ).first()

                    if existing:
                        bucket = _resolve_deal_conflict(existing, incoming, conflict_policy, apply_changes=not preview_only)
                        totals[bucket] += 1
                    else:
                        if not preview_only:
                            Deal.objects.create(
                                organization=org,
                                customer=customer,
                                pipeline=default_pipeline,
                                stage=default_stage,
                                owner=owner,
                                title=title,
                                amount=incoming['amount'],
                                currency=incoming['currency'],
                                status=incoming['status'],
                                next_step=incoming['next_step'],
                            )
                        totals['created'] += 1
                else:
                    totals['skipped'] += 1
        finally:
            workbook.close()

        if not preview_only:
            document.status = 'ready'
            document.save(update_fields=['status'])

        job.status = SpreadsheetJobStatus.PARTIAL if totals.get('conflicts', 0) else SpreadsheetJobStatus.COMPLETED
        job.totals = totals
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'totals', 'finished_at'])
        return job
