from django.urls import path

from apps.spreadsheets.api.views import SpreadsheetDocumentListView, SpreadsheetUploadView, SpreadsheetAnalysisPreviewView, SpreadsheetSyncView

urlpatterns = [
    path("documents/", SpreadsheetDocumentListView.as_view(), name="spreadsheet-document-list"),
    path("upload/", SpreadsheetUploadView.as_view(), name="spreadsheet-upload"),
    path('<uuid:pk>/preview/', SpreadsheetAnalysisPreviewView.as_view(), name='spreadsheet-preview'),
    path('sync/', SpreadsheetSyncView.as_view(), name='spreadsheet-sync'),
]
