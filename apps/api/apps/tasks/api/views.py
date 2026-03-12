from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.activities.models import Activity
from apps.core.permissions import HasRolePerm
from ..models import Task
from ..serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRolePerm]
    required_perm_map = {
        'list': 'tasks.read',
        'retrieve': 'tasks.read',
        'create': 'tasks.create',
        'update': 'tasks.update',
        'partial_update': 'tasks.update',
        'complete': 'tasks.update',
        'reopen': 'tasks.update',
        'destroy': 'tasks.update',
    }
    serializer_class = TaskSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ['due_at', '-created_at']

    def get_queryset(self):
        qs = Task.objects.filter(organization=self.request.user.organization)
        qp = self.request.query_params
        if qp.get('mine'):
            qs = qs.filter(assigned_to=self.request.user)
        if qp.get('due_today'):
            qs = qs.filter(due_at__date=timezone.now().date())
        if qp.get('overdue'):
            qs = qs.filter(due_at__lt=timezone.now(), status='open')
        if qp.get('status'):
            qs = qs.filter(status=qp['status'])
        return qs.select_related('assigned_to', 'customer', 'deal')

    def perform_create(self, serializer):
        customer = serializer.validated_data.get('customer')
        deal = serializer.validated_data.get('deal')
        if customer and customer.organization_id != self.request.user.organization_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'customer': 'Invalid customer for organization'})
        if deal and deal.organization_id != self.request.user.organization_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'deal': 'Invalid deal for organization'})
        instance = serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )
        if instance.customer_id:
            Activity.objects.create(
                organization=instance.organization,
                actor=self.request.user,
                customer_id=instance.customer_id,
                task=instance,
                type=Activity.Type.TASK_CREATED,
                payload={'title': instance.title, 'priority': instance.priority},
            )

        try:
            from apps.automations.services.event_publisher import publish_event
            publish_event(
                organization_id=instance.organization_id,
                event_type='task.created',
                entity_type='task',
                entity_id=instance.id,
                actor_id=self.request.user.id,
                payload={
                    'title': instance.title,
                    'priority': instance.priority,
                    'due_at': instance.due_at.isoformat() if instance.due_at else None,
                    'customer_id': str(instance.customer_id) if instance.customer_id else None,
                    'deal_id': str(instance.deal_id) if instance.deal_id else None,
                    'owner_id': str(instance.assigned_to_id) if instance.assigned_to_id else None,
                },
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        customer = serializer.validated_data.get('customer')
        deal = serializer.validated_data.get('deal')
        if customer and customer.organization_id != self.request.user.organization_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'customer': 'Invalid customer for organization'})
        if deal and deal.organization_id != self.request.user.organization_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'deal': 'Invalid deal for organization'})
        serializer.save()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.completed_at = timezone.now()
        task.save(update_fields=['status', 'completed_at'])
        if task.customer_id:
            Activity.objects.create(
                organization=task.organization,
                actor=request.user,
                customer_id=task.customer_id,
                task=task,
                type=Activity.Type.TASK_DONE,
                payload={'title': task.title},
            )
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.OPEN
        task.completed_at = None
        task.save(update_fields=['status', 'completed_at'])
        return Response(TaskSerializer(task).data)
