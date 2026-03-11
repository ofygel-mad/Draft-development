from django.contrib.auth import get_user_model
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.users.models import OrganizationMembership
from apps.core.permissions import IsOrgAdmin, get_user_role
from ..models import User
from ..serializers import UserSerializer

ASSIGNABLE_ROLES = ('admin', 'manager', 'viewer')


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'email']

    def get_queryset(self):
        org = self.request.user.organization
        if not org:
            return User.objects.none()
        return User.objects.filter(organization=org).order_by('full_name')

    @action(detail=False, methods=['get'])
    def me(self, request):
        membership = OrganizationMembership.objects.filter(
            user=request.user, organization=request.user.organization,
        ).first()
        return Response({
            **UserSerializer(request.user).data,
            'role': membership.role if membership else 'viewer',
        })

    @action(detail=False, methods=['get'], url_path='team')
    def team(self, request):
        org = request.user.organization
        if not org:
            return Response({'results': []})
        users = org.users.filter(status='active').order_by('full_name')
        memberships = {
            m.user_id: m.role
            for m in OrganizationMembership.objects.filter(organization=org)
        }
        data = []
        for u in users:
            d = UserSerializer(u).data
            d['role'] = memberships.get(u.id, 'viewer')
            data.append(d)
        return Response({'results': data, 'count': len(data)})

    @action(detail=True, methods=['patch'], url_path='role', permission_classes=[IsAuthenticated, IsOrgAdmin])
    def set_role(self, request, pk=None):
        requester_role = get_user_role(request.user)
        role = request.data.get('role')

        if role not in ASSIGNABLE_ROLES:
            return Response(
                {'detail': f'Роль должна быть одной из: {", ".join(ASSIGNABLE_ROLES)}'},
                status=400,
            )
        if role == 'admin' and requester_role != 'owner':
            return Response({'detail': 'Только владелец может назначать администраторов'}, status=403)

        target = get_user_model().objects.filter(
            id=pk, organization=request.user.organization,
        ).first()
        if not target:
            return Response({'detail': 'Пользователь не найден'}, status=404)

        current_role = get_user_role(target)
        if current_role == 'owner':
            return Response({'detail': 'Нельзя изменить роль владельца организации'}, status=403)

        OrganizationMembership.objects.update_or_create(
            user=target,
            organization=request.user.organization,
            defaults={'role': role},
        )

        from apps.audit.services import log_action
        from apps.audit.models import AuditLog
        if request.user.organization:
            log_action(
                organization_id=request.user.organization.id,
                actor_id=request.user.id,
                action=AuditLog.Action.UPDATE,
                entity_type='user_role',
                entity_id=target.id,
                entity_label=f'{target.email} → {role}',
                diff={'role': role},
                request=request,
            )

        return Response({'user_id': str(target.id), 'role': role})

    @action(detail=True, methods=['post'], url_path='deactivate', permission_classes=[IsAuthenticated, IsOrgAdmin])
    def deactivate(self, request, pk=None):
        target = get_user_model().objects.filter(
            id=pk, organization=request.user.organization,
        ).first()
        if not target:
            return Response({'detail': 'Пользователь не найден'}, status=404)
        if str(target.id) == str(request.user.id):
            return Response({'detail': 'Нельзя деактивировать себя'}, status=400)
        if get_user_role(target) == 'owner':
            return Response({'detail': 'Нельзя деактивировать владельца'}, status=403)
        target.status = 'inactive'
        target.save(update_fields=['status'])
        return Response({'detail': 'Пользователь деактивирован'})

    @action(detail=True, methods=['post'], url_path='activate', permission_classes=[IsAuthenticated, IsOrgAdmin])
    def activate(self, request, pk=None):
        target = get_user_model().objects.filter(
            id=pk, organization=request.user.organization,
        ).first()
        if not target:
            return Response({'detail': 'Пользователь не найден'}, status=404)
        target.status = 'active'
        target.save(update_fields=['status'])
        return Response({'detail': 'Пользователь активирован'})
