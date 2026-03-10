from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.customers.models import Customer
        from apps.deals.models import Deal
        from apps.tasks.models import Task

        org = request.user.organization
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (month_start - timedelta(days=1)).replace(day=1)

        customers_total = Customer.objects.filter(organization=org, deleted_at__isnull=True).count()
        customers_this_month = Customer.objects.filter(organization=org, created_at__gte=month_start).count()
        customers_prev_month = Customer.objects.filter(
            organization=org, created_at__gte=prev_start, created_at__lt=month_start
        ).count()

        active_deals = Deal.objects.filter(organization=org, status='open', deleted_at__isnull=True).count()
        revenue = Deal.objects.filter(
            organization=org, status='won', closed_at__gte=month_start,
        ).aggregate(t=Sum('amount'))['t'] or 0

        tasks_today = Task.objects.filter(
            organization=org,
            assigned_to=request.user,
            status='open',
            due_at__date=now.date(),
        ).count()

        overdue_tasks = Task.objects.filter(
            organization=org,
            assigned_to=request.user,
            status='open',
            due_at__lt=now,
        ).count()

        recent_customers = Customer.objects.filter(
            organization=org, deleted_at__isnull=True
        ).order_by('-created_at').values('id', 'full_name', 'company_name', 'status', 'created_at')[:5]

        return Response({
            'customers_count': customers_total,
            'customers_delta': customers_this_month - customers_prev_month,
            'active_deals_count': active_deals,
            'revenue_month': float(revenue),
            'tasks_today': tasks_today,
            'overdue_tasks': overdue_tasks,
            'recent_customers': list(recent_customers),
        })
