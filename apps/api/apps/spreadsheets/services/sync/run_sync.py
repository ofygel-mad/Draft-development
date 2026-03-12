from __future__ import annotations

from decimal import Decimal, InvalidOperation
from itertools import islice

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
BATCH_SIZE = 500


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



def _apply_customer_conflict(existing: Customer, incoming: dict, conflict_policy: str) -> tuple[str, list[str]]:
    mutable_fields = ('full_name', 'company_name', 'email', 'phone', 'source', 'status', 'notes')
    changed_fields = [f for f in mutable_fields if f in incoming and str(getattr(existing, f, '') or '') != str(incoming[f] or '')]
    if not changed_fields:
        return 'skipped', []

    if conflict_policy == 'manual_review':
        return 'conflicts', []
    if conflict_policy == 'crm_wins':
        return 'skipped', []

    for field in changed_fields:
        setattr(existing, field, incoming[field])
    return 'updated', changed_fields



def _apply_deal_conflict(existing: Deal, incoming: dict, conflict_policy: str) -> tuple[str, list[str]]:
    mutable_fields = ('title', 'amount', 'currency', 'status', 'next_step')
    changed_fields = [f for f in mutable_fields if f in incoming and str(getattr(existing, f, '') or '') != str(incoming[f] or '')]
    if not changed_fields:
        return 'skipped', []

    if conflict_policy == 'manual_review':
        return 'conflicts', []
    if conflict_policy == 'crm_wins':
        return 'skipped', []

    for field in changed_fields:
        setattr(existing, field, incoming[field])
    return 'updated', changed_fields


def _iter_batches(iterator, batch_size: int = BATCH_SIZE):
    while True:
        batch = list(islice(iterator, batch_size))
        if not batch:
            return
        yield batch


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
        row_iterator = sheet.iter_rows(values_only=True)
        first_row = next(row_iterator, None)
        if first_row is None:
            job.status = SpreadsheetJobStatus.COMPLETED
            job.totals = totals
            job.finished_at = timezone.now()
            job.save(update_fields=['status', 'totals', 'finished_at'])
            return job

        headers = [str(v).strip() if v is not None else '' for v in first_row]
        org = Organization.objects.get(id=document.organization_id)
        owner = User.objects.filter(id=document.uploaded_by_user_id).first()
        default_pipeline = ensure_default_pipeline(org)
        default_stage = default_pipeline.stages.order_by('position').first()

        for row_batch in _iter_batches(row_iterator):
            now = timezone.now()
            prepared_rows: list[dict[str, str]] = []
            for row in row_batch:
                data = _row_to_data(headers, row, mapping.mapping_json)
                if not data:
                    totals['skipped'] += 1
                    continue
                prepared_rows.append(data)

            if not prepared_rows:
                continue

            if mapping.entity_type == SpreadsheetMappingEntityType.CUSTOMER:
                phones = {row.get('phone', '').strip() for row in prepared_rows if row.get('phone', '').strip()}
                emails = {row.get('email', '').strip() for row in prepared_rows if row.get('email', '').strip()}

                existing_by_phone = {
                    customer.phone: customer
                    for customer in Customer.objects.filter(organization=org, deleted_at__isnull=True, phone__in=phones)
                } if phones else {}
                existing_by_email = {
                    customer.email: customer
                    for customer in Customer.objects.filter(organization=org, deleted_at__isnull=True, email__in=emails)
                } if emails else {}

                to_create: list[Customer] = []
                to_update: list[Customer] = []
                for data in prepared_rows:
                    phone = data.get('phone', '').strip()
                    email = data.get('email', '').strip()
                    existing = existing_by_phone.get(phone) if phone else existing_by_email.get(email)

                    if existing:
                        bucket, changed_fields = _apply_customer_conflict(existing, data, conflict_policy)
                        totals[bucket] += 1
                        if changed_fields and not preview_only and bucket == 'updated':
                            existing.updated_at = now
                            to_update.append(existing)
                    else:
                        if not data.get('full_name') and not phone and not email:
                            totals['skipped'] += 1
                            continue
                        if not preview_only:
                            to_create.append(
                                Customer(
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
                            )
                        totals['created'] += 1

                if not preview_only:
                    if to_create:
                        Customer.objects.bulk_create(to_create, batch_size=BATCH_SIZE)
                    if to_update:
                        Customer.objects.bulk_update(
                            to_update,
                            fields=['full_name', 'company_name', 'email', 'phone', 'source', 'status', 'notes', 'updated_at'],
                            batch_size=BATCH_SIZE,
                        )

            elif mapping.entity_type == SpreadsheetMappingEntityType.DEAL:
                customer_phones = {row.get('customer_phone', '').strip() for row in prepared_rows if row.get('customer_phone', '').strip()}
                customer_emails = {row.get('customer_email', '').strip() for row in prepared_rows if row.get('customer_email', '').strip()}
                customer_names = {row.get('customer_name', '').strip() for row in prepared_rows if row.get('customer_name', '').strip()}

                customers_by_phone = {
                    customer.phone: customer
                    for customer in Customer.objects.filter(organization=org, deleted_at__isnull=True, phone__in=customer_phones)
                } if customer_phones else {}
                customers_by_email = {
                    customer.email: customer
                    for customer in Customer.objects.filter(organization=org, deleted_at__isnull=True, email__in=customer_emails)
                } if customer_emails else {}
                customers_by_name = {
                    customer.full_name: customer
                    for customer in Customer.objects.filter(organization=org, deleted_at__isnull=True, full_name__in=customer_names)
                } if customer_names else {}

                candidate_titles = {row.get('title', '').strip() for row in prepared_rows if row.get('title', '').strip()}
                candidate_customer_ids = {
                    c.id
                    for c in [*customers_by_phone.values(), *customers_by_email.values(), *customers_by_name.values()]
                }
                existing_deals = {
                    (deal.customer_id, deal.title): deal
                    for deal in Deal.objects.filter(
                        organization=org,
                        deleted_at__isnull=True,
                        customer_id__in=candidate_customer_ids,
                        title__in=candidate_titles,
                    )
                } if candidate_titles and candidate_customer_ids else {}

                deals_to_create: list[Deal] = []
                deals_to_update: list[Deal] = []
                for data in prepared_rows:
                    title = data.get('title', '').strip()
                    if not title:
                        totals['skipped'] += 1
                        continue

                    customer_phone = data.get('customer_phone', '').strip()
                    customer_email = data.get('customer_email', '').strip()
                    customer_name = data.get('customer_name', '').strip()
                    customer = None
                    if customer_phone:
                        customer = customers_by_phone.get(customer_phone)
                    elif customer_email:
                        customer = customers_by_email.get(customer_email)
                    elif customer_name:
                        customer = customers_by_name.get(customer_name)

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
                    existing = existing_deals.get((customer.id, title))
                    if existing:
                        bucket, changed_fields = _apply_deal_conflict(existing, incoming, conflict_policy)
                        totals[bucket] += 1
                        if changed_fields and not preview_only and bucket == 'updated':
                            existing.updated_at = now
                            deals_to_update.append(existing)
                    else:
                        if not preview_only:
                            deals_to_create.append(
                                Deal(
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
                            )
                        totals['created'] += 1

                if not preview_only:
                    if deals_to_create:
                        Deal.objects.bulk_create(deals_to_create, batch_size=BATCH_SIZE)
                    if deals_to_update:
                        Deal.objects.bulk_update(
                            deals_to_update,
                            fields=['title', 'amount', 'currency', 'status', 'next_step', 'updated_at'],
                            batch_size=BATCH_SIZE,
                        )
            else:
                totals['skipped'] += len(prepared_rows)
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
