from django.urls import path

from apps.spreadsheets.api.views import SpreadsheetDocumentListView, SpreadsheetUploadView

urlpatterns = [
    path("documents/", SpreadsheetDocumentListView.as_view(), name="spreadsheet-document-list"),
    path("upload/", SpreadsheetUploadView.as_view(), name="spreadsheet-upload"),
]
