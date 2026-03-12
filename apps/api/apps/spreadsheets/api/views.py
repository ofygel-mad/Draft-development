from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.response import Response
from apps.core.permissions import HasRolePerm
from apps.spreadsheets.api.serializers import (
    SpreadsheetDocumentSerializer,
    SpreadsheetAnalysisPreviewSerializer,
    SpreadsheetSyncRequestSerializer,
    SpreadsheetSyncJobSerializer,
)
from apps.spreadsheets.services.upload.upload_workbook import upload_workbook
from apps.spreadsheets.services.sync.run_sync import run_sync
from apps.spreadsheets.selectors.document_queries import (
    get_spreadsheet_for_user,
    list_spreadsheets_for_user,
)


class SpreadsheetDocumentListView(generics.ListAPIView):
    serializer_class = SpreadsheetDocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.read'

    def get_queryset(self):
        return list_spreadsheets_for_user(user=self.request.user)


class SpreadsheetUploadView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.upload'
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        import os
        import uuid
        from django.conf import settings as django_settings

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'file обязателен'}, status=400)

        allowed = {'.xlsx', '.xls', '.csv', '.ods'}
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in allowed:
            return Response(
                {'error': f'Поддерживаются: {", ".join(sorted(allowed))}'},
                status=400,
            )

        upload_dir = os.path.join(django_settings.MEDIA_ROOT, 'spreadsheets')
        os.makedirs(upload_dir, exist_ok=True)
        storage_key = f'spreadsheets/{uuid.uuid4()}{ext}'
        file_path = os.path.join(django_settings.MEDIA_ROOT, storage_key)

        with open(file_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        result = upload_workbook(
            organization_id=request.user.organization_id,
            uploaded_by_user_id=request.user.id,
            title=os.path.splitext(file.name)[0],
            filename=file.name,
            mime_type=file.content_type or 'application/octet-stream',
            storage_key=storage_key,
        )
        return Response(
            {'id': str(result.document.id), 'status': result.document.status},
            status=status.HTTP_201_CREATED,
        )


class SpreadsheetAnalysisPreviewView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.read'

    def get(self, request, pk):
        document = get_spreadsheet_for_user(user=request.user, spreadsheet_id=pk)
        return Response(SpreadsheetAnalysisPreviewSerializer(document).data)


class SpreadsheetSyncView(APIView):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm = 'spreadsheets.sync'

    def post(self, request):
        serializer = SpreadsheetSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = get_spreadsheet_for_user(
            user=request.user,
            spreadsheet_id=serializer.validated_data['document_id'],
        )
        job = run_sync(
            document=document,
            mapping_revision=serializer.validated_data['mapping_revision'],
            conflict_policy=serializer.validated_data['conflict_policy'],
            preview_only=serializer.validated_data['preview_only'],
            idempotency_key=request.headers.get('Idempotency-Key', ''),
        )
        return Response(SpreadsheetSyncJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
