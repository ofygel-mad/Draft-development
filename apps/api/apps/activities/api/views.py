from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from ..models import Activity
from ..serializers import ActivitySerializer


class ActivityListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ActivitySerializer

    def get_queryset(self):
        qs = Activity.objects.filter(organization=self.request.user.organization)
        qp = self.request.query_params
        if qp.get('customer_id'):
            qs = qs.filter(customer_id=qp['customer_id'])
        if qp.get('deal_id'):
            qs = qs.filter(deal_id=qp['deal_id'])
        return qs.select_related('actor')[:100]
