from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'search'

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        types = request.query_params.get('types', 'customers,deals,tasks').split(',')
        limit = min(int(request.query_params.get('limit', 5)), 10)
        org = request.user.organization

        if len(q) < 2:
            return Response({'results': [], 'query': q})

        results = []

        if 'customers' in types:
            from apps.customers.models import Customer

            sq = SearchQuery(q, config='russian')
            qs = (
                Customer.objects.filter(
                    organization=org,
                    deleted_at__isnull=True,
                )
                .filter(
                    Q(search_vector=sq)
                    | Q(phone__icontains=q)
                    | Q(email__icontains=q)
                )
                .annotate(rank=SearchRank('search_vector', sq))
                .order_by('-rank')
                .values('id', 'full_name', 'company_name', 'phone', 'status')[:limit]
            )

            for c in qs:
                results.append({
                    'id': str(c['id']),
                    'type': 'customer',
                    'label': c['full_name'],
                    'sublabel': c['company_name'] or c['phone'] or '',
                    'status': c['status'],
                    'path': f"/customers/{c['id']}",
                })

        if 'deals' in types:
            from apps.deals.models import Deal

            qs = Deal.objects.filter(
                organization=org,
                deleted_at__isnull=True,
            ).filter(
                Q(title__icontains=q) | Q(customer__full_name__icontains=q)
            ).select_related('customer', 'stage').values(
                'id', 'title', 'amount', 'currency', 'status',
                'customer__full_name', 'stage__name',
            )[:limit]

            for d in qs:
                results.append({
                    'id': str(d['id']),
                    'type': 'deal',
                    'label': d['title'],
                    'sublabel': d['customer__full_name'] or '',
                    'status': d['status'],
                    'path': f"/deals/{d['id']}",
                })

        if 'tasks' in types:
            from apps.tasks.models import Task

            qs = Task.objects.filter(
                organization=org,
                status='open',
            ).filter(
                Q(title__icontains=q) | Q(description__icontains=q)
            ).values('id', 'title', 'priority', 'due_at')[:limit]

            for t in qs:
                results.append({
                    'id': str(t['id']),
                    'type': 'task',
                    'label': t['title'],
                    'sublabel': t['priority'],
                    'path': '/tasks',
                })

        return Response({'results': results, 'query': q})
