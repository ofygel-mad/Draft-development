from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from ..models import Task
from ..serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
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
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.completed_at = timezone.now()
        task.save(update_fields=['status', 'completed_at'])
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.OPEN
        task.completed_at = None
        task.save(update_fields=['status', 'completed_at'])
        return Response(TaskSerializer(task).data)
