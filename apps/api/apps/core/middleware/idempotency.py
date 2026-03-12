import hashlib
import json
from datetime import timedelta

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from apps.core.models import IdempotencyKey

WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
PROTECTED_PREFIXES = ('/api/v1/imports/', '/api/v1/spreadsheets/', '/api/v1/deals/', '/api/v1/customers/', '/api/v1/tasks/')


class IdempotencyKeyMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.method not in WRITE_METHODS or not request.path.startswith(PROTECTED_PREFIXES):
            return None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        key = request.headers.get('Idempotency-Key', '').strip()
        if not key:
            return None
        body = request.body.decode('utf-8') if request.body else ''
        request_hash = hashlib.sha256(body.encode('utf-8')).hexdigest()
        existing = IdempotencyKey.objects.filter(key=key, user=user, method=request.method, path=request.path, expires_at__gt=timezone.now()).first()
        if existing and existing.request_hash != request_hash:
            return JsonResponse({'detail': 'Idempotency-Key reused with different payload.'}, status=409)
        if existing and existing.response_code:
            return JsonResponse(existing.response_body, status=existing.response_code)
        request.idempotency_key = key
        request.idempotency_hash = request_hash
        return None

    def process_response(self, request, response):
        key = getattr(request, 'idempotency_key', None)
        if not key or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return response
        body = getattr(response, 'data', None)
        if body is None:
            try:
                body = json.loads(response.content.decode('utf-8'))
            except Exception:
                body = {'detail': 'stored without structured body'}
        IdempotencyKey.objects.update_or_create(
            key=key,
            user=request.user,
            method=request.method,
            path=request.path,
            defaults={
                'request_hash': getattr(request, 'idempotency_hash', ''),
                'response_code': response.status_code,
                'response_body': body,
                'expires_at': timezone.now() + timedelta(seconds=settings.IDEMPOTENCY_KEY_TTL_SECONDS),
            },
        )
        return response
