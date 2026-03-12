from __future__ import annotations

from apps.imports.models import ImportJob

IMPORT_TYPE_ALIASES = {
    'customers': ImportJob.ImportType.CUSTOMER,
    'customer': ImportJob.ImportType.CUSTOMER,
    'deals': ImportJob.ImportType.DEAL,
    'deal': ImportJob.ImportType.DEAL,
    'tasks': ImportJob.ImportType.TASK,
    'task': ImportJob.ImportType.TASK,
    'spreadsheets': ImportJob.ImportType.SPREADSHEET,
    'spreadsheet': ImportJob.ImportType.SPREADSHEET,
}

ALLOWED_TRANSITIONS = {
    ImportJob.Status.UPLOADED: {ImportJob.Status.ANALYZING, ImportJob.Status.CANCELLED},
    ImportJob.Status.ANALYZING: {ImportJob.Status.MAPPING_REQUIRED, ImportJob.Status.FAILED, ImportJob.Status.CANCELLED},
    ImportJob.Status.MAPPING_REQUIRED: {ImportJob.Status.MAPPING_CONFIRMED, ImportJob.Status.CANCELLED, ImportJob.Status.FAILED},
    ImportJob.Status.MAPPING_CONFIRMED: {ImportJob.Status.PROCESSING, ImportJob.Status.CANCELLED, ImportJob.Status.FAILED},
    ImportJob.Status.PROCESSING: {ImportJob.Status.COMPLETED, ImportJob.Status.FAILED, ImportJob.Status.CANCELLED},
    ImportJob.Status.COMPLETED: set(),
    ImportJob.Status.FAILED: set(),
    ImportJob.Status.CANCELLED: set(),
}


class InvalidImportTransitionError(ValueError):
    pass


def normalize_import_type(raw_value: str | None) -> str:
    normalized = IMPORT_TYPE_ALIASES.get((raw_value or ImportJob.ImportType.CUSTOMER).strip().lower())
    if normalized:
        return normalized
    allowed = ', '.join(sorted({value for value in IMPORT_TYPE_ALIASES.values()}))
    raise ValueError(f'Неподдерживаемый import_type. Разрешено: {allowed}')


def can_transition(*, current: str, next_status: str) -> bool:
    if current == next_status:
        return True
    return next_status in ALLOWED_TRANSITIONS.get(current, set())


def transition_job(*, job: ImportJob, next_status: str, update_fields: list[str] | None = None) -> ImportJob:
    if not can_transition(current=job.status, next_status=next_status):
        raise InvalidImportTransitionError(f'Переход {job.status} -> {next_status} запрещён')

    job.status = next_status
    save_fields = {'status'}
    if update_fields:
        save_fields.update(update_fields)
    job.save(update_fields=sorted(save_fields))
    return job
