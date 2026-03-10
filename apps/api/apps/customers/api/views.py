from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.activities.models import Activity, Note
from apps.customers.models import Customer
from apps.customers.selectors.customer_queries import list_customers
from apps.customers.serializers import CustomerListSerializer, CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['full_name', 'company_name', 'phone', 'email']
    ordering_fields = ['created_at', 'full_name', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return list_customers(organization_id=self.request.user.organization_id)

    def get_serializer_class(self):
        return CustomerListSerializer if self.action == 'list' else CustomerSerializer

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            owner=self.request.user,
        )

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])

    @action(detail=True, methods=['post'])
    def notes(self, request, pk=None):
        customer = self.get_object()
        body = request.data.get('body', '').strip()
        if not body:
            return Response({'body': ['This field is required.']}, status=400)

        note = Note.objects.create(
            organization=request.user.organization,
            author=request.user,
            customer=customer,
            body=body,
        )
        Activity.objects.create(
            organization=request.user.organization,
            actor=request.user,
            customer=customer,
            type='note',
            payload={'body': body, 'note_id': str(note.id)},
        )
        return Response({'id': str(note.id), 'body': note.body, 'created_at': note.created_at.isoformat()}, status=201)

    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        customer = self.get_object()
        qs = Activity.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).select_related('actor').order_by('-created_at')[:50]
        data = [
            {
                'id': str(a.id),
                'type': a.type,
                'payload': a.payload,
                'actor': {'full_name': a.actor.full_name} if a.actor else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in qs
        ]
        return Response({'results': data})

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        customer = self.get_object()
        from apps.tasks.models import Task
        from apps.tasks.serializers import TaskSerializer

        qs = Task.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).order_by('status', 'due_at')
        return Response({'results': TaskSerializer(qs, many=True).data})

    @action(detail=True, methods=['get'])
    def deals(self, request, pk=None):
        customer = self.get_object()
        from apps.deals.models import Deal
        from apps.deals.serializers import DealListSerializer

        qs = Deal.objects.filter(
            organization=request.user.organization,
            customer=customer,
            deleted_at__isnull=True,
        ).select_related('stage', 'pipeline').order_by('-created_at')
        return Response({'results': DealListSerializer(qs, many=True).data})
