from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated

from ..models import Activity, Note
from ..serializers import ActivitySerializer


class ActivityListView(ListCreateAPIView):
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

    def create(self, request, *args, **kwargs):
        body = request.data.get('body', '').strip()
        customer_id = request.data.get('customer_id')
        deal_id = request.data.get('deal_id')
        if not body:
            from rest_framework.response import Response
            return Response({'body': ['This field is required.']}, status=400)

        note = Note.objects.create(
            organization=request.user.organization,
            author=request.user,
            customer_id=customer_id,
            deal_id=deal_id,
            body=body,
        )
        activity = Activity.objects.create(
            organization=request.user.organization,
            actor=request.user,
            customer_id=customer_id,
            deal_id=deal_id,
            type='note',
            payload={'body': body, 'note_id': str(note.id)},
        )
        from rest_framework.response import Response
        return Response(ActivitySerializer(activity).data, status=201)
