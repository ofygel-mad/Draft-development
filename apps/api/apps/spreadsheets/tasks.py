from celery import shared_task


@shared_task(queue="spreadsheets")
def analyze_spreadsheet_version(version_id: str) -> None:
    return None


@shared_task(queue="spreadsheets")
def sync_spreadsheet_job(sync_job_id: str) -> None:
    return None
