from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer, CustomerListSerializer
from apps.customers.selectors.customer_queries import list_customers


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

    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        customer = self.get_object()
        from apps.activities.models import Activity
        from apps.activities.serializers import ActivitySerializer
        qs = Activity.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).order_by('-created_at')[:50]
        return Response(ActivitySerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        customer = self.get_object()
        from apps.tasks.models import Task
        from apps.tasks.serializers import TaskSerializer
        qs = Task.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).order_by('status', 'due_at')
        return Response(TaskSerializer(qs, many=True).data)

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
        return Response(DealListSerializer(qs, many=True).data)
