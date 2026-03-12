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


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from apps.core.permissions import HasRolePerm
from rest_framework.response import Response
from apps.spreadsheets.api.serializers import SpreadsheetAnalysisPreviewSerializer, SpreadsheetSyncRequestSerializer, SpreadsheetSyncJobSerializer
from apps.spreadsheets.services.upload.upload_workbook import upload_workbook
from apps.spreadsheets.services.sync.run_sync import run_sync


class SpreadsheetUploadView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.upload'
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        document = upload_workbook(file=request.FILES['file'], actor=request.user)
        return Response({'id': str(document.id), 'status': document.status}, status=status.HTTP_201_CREATED)


class SpreadsheetAnalysisPreviewView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.read'

    def get(self, request, pk):
        document = SpreadsheetDocument.objects.get(pk=pk)
        return Response(SpreadsheetAnalysisPreviewSerializer(document).data)


class SpreadsheetSyncView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.sync'

    def post(self, request):
        serializer = SpreadsheetSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = SpreadsheetDocument.objects.get(pk=serializer.validated_data['document_id'])
        job = run_sync(document=document, mapping_revision=serializer.validated_data['mapping_revision'], conflict_policy=serializer.validated_data['conflict_policy'], preview_only=serializer.validated_data['preview_only'], idempotency_key=request.headers.get('Idempotency-Key', ''))
        return Response(SpreadsheetSyncJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
