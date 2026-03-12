from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import get_user_capabilities, get_user_role
from apps.customers.models import Customer
from apps.deals.models import Deal
from apps.notifications.models import Notification
from apps.tasks.models import Task


class SessionBootstrapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        org = getattr(user, 'organization', None)
        role = get_user_role(user)
        today = timezone.localdate()
        return Response({
            'user': {'id': str(user.id), 'full_name': user.full_name, 'email': user.email},
            'organization': {'id': str(org.id) if org else None, 'name': getattr(org, 'name', None), 'currency': getattr(org, 'currency', 'KZT')},
            'role': role,
            'capabilities': sorted(get_user_capabilities(user)),
            'counters': {
                'unread_notifications': Notification.objects.filter(user=user, is_read=False).count(),
                'tasks_today': Task.objects.filter(assigned_to=user, is_completed=False).count(),
                'deals_at_risk': Deal.objects.filter(owner=user, stage__in=['proposal', 'negotiation']).count(),
            },
            'daily_summary': {
                'customers_created_today': Customer.objects.filter(owner=user, created_at__date=today).count(),
                'open_tasks': Task.objects.filter(assigned_to=user, is_completed=False).count(),
                'overdue_tasks': Task.objects.filter(assigned_to=user, is_completed=False, due_at__date__lt=today).count(),
            },
        })
