from django.shortcuts import get_object_or_404

from apps.spreadsheets.models import SpreadsheetDocument


def get_spreadsheet_for_user(*, user, spreadsheet_id):
    return get_object_or_404(
        SpreadsheetDocument.objects.select_related('current_version'),
        id=spreadsheet_id,
        organization_id=user.organization_id,
    )


def list_spreadsheets_for_user(*, user):
    return SpreadsheetDocument.objects.filter(
        organization_id=user.organization_id,
    ).order_by('-created_at')
