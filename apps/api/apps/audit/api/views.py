from rest_framework import filters, serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'entity_type', 'entity_id', 'entity_label',
            'actor_name', 'diff', 'ip_address', 'created_at',
        ]

    def get_actor_name(self, obj):
        return obj.actor.full_name if obj.actor else 'Система'


class AuditLogListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuditLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['entity_type', 'entity_label', 'actor__full_name']
    ordering = ['-created_at']

    def get_queryset(self):
        org = self.request.user.organization
        if org.mode != 'industrial':
            return AuditLog.objects.none()

        qs = AuditLog.objects.filter(organization=org).select_related('actor')

        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        return qs[:500]
