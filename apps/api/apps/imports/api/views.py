import os
import logging
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from apps.imports.models import ImportJob
from apps.imports.serializers import ImportJobSerializer

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, 'imports')
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}


def _save_upload_file(request, file):
    """Сохраняет файл на диск, возвращает путь."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{request.user.id}_{file.name.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)
    return file_path


class ImportJobViewSet(viewsets.ModelViewSet):
    """
    ИСПРАВЛЕНО: был ReadOnlyModelViewSet — POST /imports/ возвращал 405.
    """
    http_method_names = ['get', 'post', 'head', 'options']
    permission_classes = [IsAuthenticated]
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        return ImportJob.objects.filter(
            organization=self.request.user.organization,
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/imports/
        ИСПРАВЛЕНО: фронт постит на /imports/, а не на /imports/upload/.
        """
        return self._handle_upload(request)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """POST /api/v1/imports/upload/ — для обратной совместимости."""
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

        file_path = _save_upload_file(request, file)

        # ИСПРАВЛЕНО: фронт шлёт 'customers' (plural), модель ждёт 'customer' (singular)
        import_type = request.data.get('import_type', 'customer')
        if import_type and import_type.endswith('s') and import_type != 'deals':
            import_type = import_type.rstrip('s')

        job = ImportJob.objects.create(
            organization=request.user.organization,
            created_by=request.user,
            import_type=import_type,
            file_name=file.name,
            file_path=file_path,
            status=ImportJob.Status.PENDING,
        )

        from apps.imports.tasks import analyze_import_file
        analyze_import_file.delay(str(job.id))

        return Response(ImportJobSerializer(job).data, status=201)

    @action(detail=True, methods=['post'], url_path='mapping')
    def mapping(self, request, pk=None):
        """
        POST /api/v1/imports/{id}/mapping/
        ИСПРАВЛЕНО: фронт шлёт на /mapping/, бэк имел только /confirm_mapping/.
        """
        return self._handle_confirm_mapping(request, pk)

    @action(detail=True, methods=['post'])
    def confirm_mapping(self, request, pk=None):
        """POST /api/v1/imports/{id}/confirm_mapping/ — для обратной совместимости."""
        return self._handle_confirm_mapping(request, pk)

    def _handle_confirm_mapping(self, request, pk):
        job = self.get_object()
        if job.status not in (ImportJob.Status.MAPPING, ImportJob.Status.PENDING, ImportJob.Status.MAPPING_CONFIRMED):
            return Response(
                {'error': f'Нельзя подтвердить в статусе {job.status}'},
                status=400,
            )

        # ИСПРАВЛЕНО: фронт шлёт 'mapping', бэк ожидал 'column_mapping'
        mapping = request.data.get('column_mapping') or request.data.get('mapping')
        if not mapping:
            return Response({'error': 'Укажите column_mapping или mapping'}, status=400)

        job.column_mapping = mapping
        job.status = ImportJob.Status.MAPPING_CONFIRMED
        job.save(update_fields=['column_mapping', 'status'])

        from apps.imports.tasks import process_import_job
        process_import_job.delay(str(job.id))

        return Response(ImportJobSerializer(job).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        POST /api/v1/imports/{id}/start/
        ИСПРАВЛЕНО: этого эндпоинта не существовало — фронт получал 404.
        """
        job = self.get_object()
        if job.status == ImportJob.Status.MAPPING_CONFIRMED:
            from apps.imports.tasks import process_import_job
            process_import_job.delay(str(job.id))
        elif job.status in (ImportJob.Status.PENDING, ImportJob.Status.MAPPING):
            return Response(
                {'error': 'Сначала подтвердите маппинг колонок'},
                status=400,
            )
        return Response(ImportJobSerializer(job).data)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        job = self.get_object()
        return Response({
            'id': str(job.id),
            'status': job.status,
            'error': job.error_message,
            'stats': job.stats or {},
            'created_at': job.created_at,
            'updated_at': job.updated_at,
        })
