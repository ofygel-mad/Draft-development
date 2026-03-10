from rest_framework import generics

from apps.spreadsheets.api.serializers import SpreadsheetDocumentSerializer, SpreadsheetUploadSerializer
from apps.spreadsheets.models import SpreadsheetDocument


class SpreadsheetDocumentListView(generics.ListAPIView):
    serializer_class = SpreadsheetDocumentSerializer

    def get_queryset(self):
        organization_id = self.request.query_params.get("organization_id")
        queryset = SpreadsheetDocument.objects.all().order_by("-created_at")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        return queryset


class SpreadsheetUploadView(generics.CreateAPIView):
    serializer_class = SpreadsheetUploadSerializer
