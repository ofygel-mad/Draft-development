import os
import logging
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasRolePerm
from apps.imports.models import ImportJob
from apps.imports.serializers import ImportJobSerializer
from apps.imports.services.state_machine import (
    InvalidImportTransitionError,
    normalize_import_type,
    transition_job,
)

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, 'imports')
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}

TERMINAL_STATUSES = {
    ImportJob.Status.COMPLETED,
    ImportJob.Status.FAILED,
    ImportJob.Status.CANCELLED,
}


def _save_upload_file(request, file):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{request.user.id}_{file.name.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)
    return file_path


class ImportJobViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm_map = {
        'list': 'imports.read',
        'retrieve': 'imports.read',
        'create': 'imports.upload',
        'upload': 'imports.upload',
        'mapping': 'imports.upload',
        'confirm_mapping': 'imports.upload',
        'start': 'imports.upload',
        'status': 'imports.read',
        'destroy': 'imports.upload',
    }
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        return ImportJob.objects.filter(
            organization=self.request.user.organization,
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        return self._handle_upload(request)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        return self._handle_upload(request)

    def _handle_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Файл обязателен'}, status=400)
        if file.size > MAX_FILE_SIZE:
            return Response({'error': 'Максимальный размер файла — 10 МБ'}, status=400)

        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Поддерживаются: {", ".join(sorted(ALLOWED_EXTENSIONS))}'},
                status=400,
            )

        try:
            import_type = normalize_import_type(request.data.get('import_type', 'customer'))
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        file_path = _save_upload_file(request, file)

        job = ImportJob.objects.create(
            organization=request.user.organization,
            created_by=request.user,
            import_type=import_type,
            file_name=file.name,
            file_path=file_path,
            status=ImportJob.Status.UPLOADED,
        )

        from apps.imports.tasks import analyze_import_file
        analyze_import_file.delay(str(job.id))

        transition_job(job=job, next_status=ImportJob.Status.ANALYZING)

        return Response(ImportJobSerializer(job).data, status=201)

    @action(detail=True, methods=['post'], url_path='mapping')
    def mapping(self, request, pk=None):
        return self._handle_confirm_mapping(request, pk)

    @action(detail=True, methods=['post'])
    def confirm_mapping(self, request, pk=None):
        return self._handle_confirm_mapping(request, pk)

    def _handle_confirm_mapping(self, request, pk):
        job = self.get_object()
        if job.status not in (ImportJob.Status.MAPPING_REQUIRED, ImportJob.Status.MAPPING_CONFIRMED):
            return Response(
                {'error': f'Нельзя подтвердить в статусе {job.status}'},
                status=400,
            )

        mapping = request.data.get('column_mapping') or request.data.get('mapping')
        if not mapping:
            return Response({'error': 'Укажите column_mapping или mapping'}, status=400)

        job.column_mapping = mapping
        try:
            transition_job(
                job=job,
                next_status=ImportJob.Status.MAPPING_CONFIRMED,
                update_fields=['column_mapping'],
            )
        except InvalidImportTransitionError as exc:
            return Response({'error': str(exc)}, status=400)

        return Response(ImportJobSerializer(job).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        job = self.get_object()
        if job.status in (ImportJob.Status.PROCESSING, ImportJob.Status.COMPLETED):
            return Response(ImportJobSerializer(job).data, status=status.HTTP_200_OK)

        if job.status != ImportJob.Status.MAPPING_CONFIRMED:
            return Response(
                {'error': 'Сначала подтвердите маппинг колонок'},
                status=400,
            )

        job.started_at = timezone.now()
        try:
            transition_job(
                job=job,
                next_status=ImportJob.Status.PROCESSING,
                update_fields=['started_at'],
            )
        except InvalidImportTransitionError as exc:
            return Response({'error': str(exc)}, status=400)

        from apps.imports.tasks import process_import_job
        process_import_job.delay(str(job.id))

        return Response(ImportJobSerializer(job).data)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        job = self.get_object()
        total = max(job.total_rows or 0, 1)
        processed = (job.imported_rows or 0) + (job.failed_rows or 0)
        percent = min(100, int((processed / total) * 100)) if total else 0
        return Response({
            'id': str(job.id),
            'status': job.status,
            'stage': job.status,
            'counts': {
                'total_rows': job.total_rows,
                'imported_rows': job.imported_rows,
                'failed_rows': job.failed_rows,
            },
            'percent': percent,
            'warnings': job.warnings_json or [],
            'row_errors': job.row_errors_json or [],
            'error': job.error_message,
            'started_at': job.started_at,
            'finished_at': job.finished_at,
            'can_retry': job.status in (ImportJob.Status.FAILED, ImportJob.Status.CANCELLED),
            'can_start': job.status == ImportJob.Status.MAPPING_CONFIRMED,
            'can_confirm_mapping': job.status == ImportJob.Status.MAPPING_REQUIRED,
            'created_at': job.created_at,
            'updated_at': job.updated_at,
        })

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        if job.status not in TERMINAL_STATUSES:
            job.finished_at = timezone.now()
            try:
                transition_job(
                    job=job,
                    next_status=ImportJob.Status.CANCELLED,
                    update_fields=['finished_at'],
                )
            except InvalidImportTransitionError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)
