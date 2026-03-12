from django.core.cache import cache
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.activities.models import Activity, Note
from apps.customers.models import Customer
from apps.customers.selectors.customer_queries import list_customers
from apps.customers.serializers import CustomerListSerializer, CustomerSerializer
from apps.audit.services import log_action
from apps.core.permissions import user_can


class CustomerViewSet(viewsets.ModelViewSet):
    @staticmethod
    def _invalidate_dashboard_cache(organization_id):
        from apps.users.models import User

        for uid in User.objects.filter(organization_id=organization_id).values_list('id', flat=True):
            cache.delete(f'dashboard:{organization_id}:{uid}')

    permission_classes = [IsAuthenticated]

    ACTION_PERMISSIONS = {
        'list': 'customers.read',
        'retrieve': 'customers.read',
        'activities': 'customers.read',
        'tasks': 'customers.read',
        'deals': 'customers.read',
        'whatsapp': 'customers.read',
        'create': 'customers.create',
        'update': 'customers.update',
        'partial_update': 'customers.update',
        'bulk': 'customers.update',
        'notes': 'customers.update',
        'destroy': 'customers.update',
    }

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        required_perm = self.ACTION_PERMISSIONS.get(getattr(self, 'action', ''), 'customers.read')
        if not user_can(request.user, required_perm):
            raise PermissionDenied('Недостаточно прав')

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['full_name', 'company_name', 'phone', 'email']
    ordering_fields = ['created_at', 'full_name', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        p = self.request.query_params
        return list_customers(
            organization_id=self.request.user.organization_id,
            search=p.get('search', ''),
            status=p.get('status', ''),
            source=p.get('source', ''),
            owner_id=p.get('owner_id'),
            created_after=p.get('created_after'),
            created_before=p.get('created_before'),
        )

    def get_serializer_class(self):
        return CustomerListSerializer if self.action == 'list' else CustomerSerializer

    def perform_create(self, serializer):
        instance = serializer.save(
            organization=self.request.user.organization,
            owner=self.request.user,
            last_contact_at=timezone.now(),
        )

        try:
            from apps.automations.services.event_publisher import publish_event
            publish_event(
                organization_id=instance.organization_id,
                event_type='customer.created',
                entity_type='customer',
                entity_id=instance.id,
                actor_id=self.request.user.id,
                payload={
                    'full_name': instance.full_name,
                    'company_name': instance.company_name or '',
                    'source': instance.source or '',
                    'status': instance.status,
                    'owner_id': str(instance.owner_id) if instance.owner_id else None,
                },
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning('event publish failed: %s', exc)
        Activity.objects.create(
            organization=instance.organization,
            actor=self.request.user,
            customer=instance,
            type=Activity.Type.CUSTOMER_CREATED,
            payload={'full_name': instance.full_name, 'source': instance.source or ''},
        )
        log_action(
            organization_id=instance.organization_id,
            actor_id=self.request.user.id,
            action='create',
            entity_type='customer',
            entity_id=str(instance.id),
            entity_label=instance.full_name,
            request=self.request,
        )
        self._invalidate_dashboard_cache(instance.organization_id)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            organization_id=instance.organization_id,
            actor_id=self.request.user.id,
            action='update',
            entity_type='customer',
            entity_id=str(instance.id),
            entity_label=instance.full_name,
            request=self.request,
        )
        self._invalidate_dashboard_cache(instance.organization_id)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])
        self._invalidate_dashboard_cache(instance.organization_id)

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        act     = request.data.get('action')
        ids     = request.data.get('ids', [])
        payload = request.data.get('payload', {})
        if not ids:
            return Response({'error': 'ids обязательны'}, status=400)

        qs = Customer.objects.filter(
            organization=request.user.organization,
            id__in=ids,
            deleted_at__isnull=True,
        )

        if act == 'delete':
            affected = qs.update(deleted_at=timezone.now())
            log_action(
                organization_id=request.user.organization_id,
                actor_id=request.user.id,
                action='delete',
                entity_type='customer_bulk',
                entity_label=f'{affected} клиентов',
                request=request,
            )
            self._invalidate_dashboard_cache(request.user.organization_id)
            return Response({'affected': affected})

        if act == 'restore':
            affected = Customer.objects.filter(
                organization=request.user.organization,
                id__in=ids,
                deleted_at__isnull=False,
            ).update(deleted_at=None)
            self._invalidate_dashboard_cache(request.user.organization_id)
            return Response({'affected': affected})

        if act == 'assign':
            owner_id = payload.get('owner_id')
            if not owner_id:
                return Response({'error': 'owner_id обязателен'}, status=400)
            affected = qs.update(owner_id=owner_id)
            self._invalidate_dashboard_cache(request.user.organization_id)
            return Response({'affected': affected})

        if act == 'change_status':
            new_status = payload.get('status')
            if new_status not in ('new', 'active', 'inactive', 'archived'):
                return Response({'error': 'Неверный статус'}, status=400)
            affected = qs.update(status=new_status)
            self._invalidate_dashboard_cache(request.user.organization_id)
            return Response({'affected': affected})

        return Response({'error': f'Неизвестное действие: {act}'}, status=400)

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
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        offset = int(request.query_params.get('offset', 0))

        total = Activity.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).count()
        qs = Activity.objects.filter(
            organization=request.user.organization,
            customer=customer,
        ).select_related('actor').order_by('-created_at')[offset:offset + page_size]
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
        return Response({'results': data, 'total': total, 'offset': offset, 'page_size': page_size})

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


    @action(detail=True, methods=['get'], url_path='whatsapp')
    def whatsapp(self, request, pk=None):
        customer = self.get_object()
        phone = (customer.phone or '').strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not phone:
            return Response({'error': 'Телефон не указан'}, status=400)
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('8') and len(phone) == 11:
            phone = '7' + phone[1:]
        wa_url = f'https://wa.me/{phone}'
        template = f'Добрый день, {customer.full_name}!'
        return Response({'url': wa_url, 'template': template, 'phone': phone})

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

    @action(detail=True, methods=['post'], url_path='follow-up')
    def set_follow_up(self, request, pk=None):
        """Устанавливает дату следующего касания и/или response_state."""
        customer = self.get_object()
        due_at = request.data.get('follow_up_due_at')
        resp_state = request.data.get('response_state', '')
        note_body = request.data.get('note', '')

        update_fields = []
        if due_at is not None:
            customer.follow_up_due_at = due_at or None
            update_fields.append('follow_up_due_at')
        if resp_state:
            customer.response_state = resp_state
            update_fields.append('response_state')
        if update_fields:
            customer.save(update_fields=update_fields)

        if note_body:
            note = Note.objects.create(
                organization=request.user.organization,
                author=request.user,
                customer=customer,
                body=note_body,
            )
            Activity.objects.create(
                organization=request.user.organization,
                actor=request.user,
                customer=customer,
                type=Activity.Type.NOTE,
                payload={'body': note_body, 'note_id': str(note.id), 'follow_up': True},
            )

        return Response(CustomerSerializer(customer).data)
