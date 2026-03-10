"""Server-Sent Events endpoint для real-time уведомлений."""
import json
import logging
import time

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 15
MAX_CONNECTION_TIME = 55


class SSEView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        def event_stream():
            last_check = timezone.now()
            start_time = time.time()
            yield _format_event('connected', {'user_id': str(user.id), 'ts': last_check.isoformat()})

            while time.time() - start_time < MAX_CONNECTION_TIME:
                time.sleep(HEARTBEAT_INTERVAL)
                try:
                    from apps.notifications.models import Notification

                    new_notifs = Notification.objects.filter(
                        recipient=user,
                        organization=user.organization,
                        is_read=False,
                        created_at__gt=last_check,
                    ).values('id', 'title', 'body', 'notification_type', 'created_at')

                    for n in new_notifs:
                        yield _format_event('notification', {
                            'id': str(n['id']),
                            'title': n['title'],
                            'body': n['body'],
                            'type': n['notification_type'],
                            'created_at': n['created_at'].isoformat(),
                        })

                    last_check = timezone.now()
                except Exception as exc:
                    logger.warning('SSE check error: %s', exc)

                yield _format_event('heartbeat', {'ts': timezone.now().isoformat()})

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream; charset=utf-8')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


def _format_event(event_type: str, data: dict) -> str:
    return f'event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'
