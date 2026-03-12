from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(
            recipient=self.request.user,
            organization=self.request.user.organization,
        )
        unread_only = self.request.query_params.get('unread')
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='read_all')
    def read_all(self, request):
        Notification.objects.filter(
            recipient=request.user,
            organization=request.user.organization,
            is_read=False,
        ).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['get'], url_path='count')
    def unread_count(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            organization=request.user.organization,
            is_read=False,
        ).count()
        return Response({'unread': count})
