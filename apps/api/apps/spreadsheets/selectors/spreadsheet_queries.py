from apps.spreadsheets.models import SpreadsheetDocument


def list_documents_for_organization(*, organization_id):
    return SpreadsheetDocument.objects.filter(organization_id=organization_id).order_by("-created_at")
