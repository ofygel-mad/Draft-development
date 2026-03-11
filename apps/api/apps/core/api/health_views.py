import logging
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        checks = {}
        status_code = 200

        try:
            from django.db import connection
            connection.ensure_connection()
            checks['database'] = 'ok'
        except Exception as e:
            logger.error('Health: db error: %s', e)
            checks['database'] = 'error'
            status_code = 503

        try:
            from django.core.cache import cache
            cache.set('health_ping', '1', timeout=5)
            assert cache.get('health_ping') == '1'
            checks['redis'] = 'ok'
        except Exception as e:
            logger.error('Health: redis error: %s', e)
            checks['redis'] = 'error'
            status_code = 503

        try:
            import redis as _redis
            from django.conf import settings
            r = _redis.from_url(settings.CELERY_BROKER_URL)
            r.ping()
            checks['celery_broker'] = 'ok'
        except Exception as e:
            logger.warning('Health: celery broker ping failed: %s', e)
            checks['celery_broker'] = 'unreachable'

        return Response(
            {'status': 'ok' if status_code == 200 else 'degraded', **checks},
            status=status_code,
        )
