from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'search'

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 8)), 20)
        types = request.query_params.get('types', '').split(',') if request.query_params.get('types') else []
        org = request.user.organization

        if len(q) < 2:
            return Response({'results': [], 'query': q})

        results = []

        if not types or 'customer' in types or 'customers' in types:
            from apps.customers.models import Customer

            sq = SearchQuery(q, config='russian')
            qs = Customer.objects.filter(
                organization=org,
                deleted_at__isnull=True,
            ).filter(
                Q(search_vector=sq) | Q(phone__icontains=q) | Q(email__icontains=q)
            ).annotate(rank=SearchRank('search_vector', sq)).order_by('-rank')[:limit]

            for c in qs:
                results.append({
                    'id': str(c.id),
                    'type': 'customer',
                    'label': c.full_name,
                    'sublabel': c.company_name or c.phone or '',
                    'path': f'/customers/{c.id}',
                    'meta': {
                        'status': c.status,
                        'follow_up_due_at': c.follow_up_due_at.isoformat() if c.follow_up_due_at else None,
                        'response_state': c.response_state,
                    },
                })

        if not types or 'deal' in types or 'deals' in types:
            from apps.deals.models import Deal

            qs = Deal.objects.filter(
                organization=org,
                deleted_at__isnull=True,
            ).filter(
                Q(title__icontains=q) | Q(customer__full_name__icontains=q)
            ).select_related('stage', 'customer')[:limit]

            for d in qs:
                results.append({
                    'id': str(d.id),
                    'type': 'deal',
                    'label': d.title,
                    'sublabel': f"{d.stage.name if d.stage_id else ''} · {d.customer.full_name if d.customer_id else ''}",
                    'path': f'/deals/{d.id}',
                    'meta': {
                        'amount': float(d.amount or 0),
                        'currency': d.currency,
                        'status': d.status,
                    },
                })

        if not types or 'task' in types or 'tasks' in types:
            from apps.tasks.models import Task

            qs = Task.objects.filter(
                organization=org,
                status=Task.Status.OPEN,
            ).filter(Q(title__icontains=q)).select_related('customer', 'assigned_to')[:limit]

            for t in qs:
                results.append({
                    'id': str(t.id),
                    'type': 'task',
                    'label': t.title,
                    'sublabel': (t.customer.full_name if t.customer_id else '') + (
                        ' · ' + t.assigned_to.full_name if t.assigned_to_id else ''
                    ),
                    'path': '/tasks',
                    'meta': {
                        'priority': t.priority,
                        'due_at': t.due_at.isoformat() if t.due_at else None,
                    },
                })

        return Response({'results': results[: limit * 2], 'query': q})
