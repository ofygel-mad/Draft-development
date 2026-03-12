from django.db import models
from rest_framework.decorators import action
from rest_framework.generics import ListCreateAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import Activity, MessageTemplate, Note
from ..serializers import ActivitySerializer, MessageTemplateSerializer


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
        return qs.select_related('actor', 'customer', 'deal')[:100]

    def create(self, request, *args, **kwargs):
        body = request.data.get('body', '').strip()
        act_type = request.data.get('type', 'note')
        customer_id = request.data.get('customer_id')
        deal_id = request.data.get('deal_id')

        if not body and act_type == 'note':
            return Response({'body': ['This field is required.']}, status=400)

        allowed_manual_types = ('note', 'call', 'whatsapp', 'email_sent', 'email_in')
        if act_type not in allowed_manual_types:
            return Response({'type': ['Invalid type.']}, status=400)

        payload = {'body': body}
        if act_type in ('email_sent', 'email_in'):
            payload['subject'] = request.data.get('subject', '')
            payload['preview'] = body[:200]
        if act_type == 'call':
            payload['duration_minutes'] = request.data.get('duration_minutes')

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
            type=act_type,
            payload={**payload, 'note_id': str(note.id)},
        )

        from django.utils import timezone

        now = timezone.now()
        if customer_id:
            from apps.customers.models import Customer

            Customer.objects.filter(pk=customer_id).update(last_contact_at=now)
        if deal_id:
            from apps.deals.models import Deal

            Deal.objects.filter(pk=deal_id).update(last_activity_at=now)

        return Response(ActivitySerializer(activity).data, status=201)


class MessageTemplateViewSet(ModelViewSet):
    """CRUD для шаблонов сообщений."""

    permission_classes = [IsAuthenticated]
    serializer_class = MessageTemplateSerializer

    def get_queryset(self):
        qs = MessageTemplate.objects.filter(
            organization=self.request.user.organization,
            is_active=True,
        )
        channel = self.request.query_params.get('channel')
        if channel:
            qs = qs.filter(channel=channel)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(name__icontains=q)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='use')
    def mark_used(self, request, pk=None):
        tpl = self.get_object()
        MessageTemplate.objects.filter(pk=tpl.pk).update(use_count=models.F('use_count') + 1)
        return Response({'ok': True})

    @action(detail=True, methods=['post'], url_path='render')
    def render_template(self, request, pk=None):
        tpl = self.get_object()
        ctx = request.data.get('context', {})
        rendered = tpl.render(ctx)
        MessageTemplate.objects.filter(pk=tpl.pk).update(use_count=models.F('use_count') + 1)
        return Response({'rendered': rendered})


class FeedView(ListAPIView):
    """Глобальная лента всех событий организации."""

    permission_classes = [IsAuthenticated]
    serializer_class = ActivitySerializer

    def get_queryset(self):
        qs = Activity.objects.filter(organization=self.request.user.organization)
        type_filter = self.request.query_params.get('type')
        if type_filter:
            qs = qs.filter(type=type_filter)
        return qs.select_related('actor', 'customer', 'deal')[:200]
