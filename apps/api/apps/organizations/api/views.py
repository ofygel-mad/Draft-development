from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import serializers, viewsets, status
from apps.organizations.models import Branch, CustomField, CustomFieldValue
from apps.organizations.serializers import OrganizationSerializer
from apps.core.permissions import IsOrgAdmin, get_user_role


class OrganizationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        if not org:
            return Response({'detail': 'Нет организации'}, status=404)
        data = OrganizationSerializer(org).data
        data['role'] = get_user_role(request.user)
        return Response(data)

    def patch(self, request):
        org = request.user.organization
        if not org:
            return Response({'detail': 'Нет организации'}, status=404)
        role = get_user_role(request.user)
        if role not in ('owner', 'admin'):
            return Response(
                {'detail': 'Недостаточно прав для изменения настроек организации'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if 'mode' in request.data and role != 'owner':
            return Response(
                {'detail': 'Только владелец может менять режим CRM'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if 'mode' in request.data:
            from apps.organizations.models import apply_mode_capabilities
            apply_mode_capabilities(org)
        from apps.audit.services import log_action
        from apps.audit.models import AuditLog
        log_action(
            organization_id=org.id,
            actor_id=request.user.id,
            action=AuditLog.Action.UPDATE,
            entity_type='organization',
            entity_id=org.id,
            entity_label=org.name,
            diff=request.data,
            request=request,
        )
        return Response(serializer.data)


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = ['id', 'name', 'field_key', 'field_type', 'entity_type',
                  'options', 'is_required', 'position', 'is_active']
        read_only_fields = ['id']


class CustomFieldViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgAdmin]
    serializer_class = CustomFieldSerializer

    def get_queryset(self):
        qs = CustomField.objects.filter(
            organization=self.request.user.organization, is_active=True,
        )
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(
        detail=False, methods=['post'],
        url_path='values/(?P<entity_type>[^/.]+)/(?P<entity_id>[^/.]+)',
        permission_classes=[IsAuthenticated],
    )
    def set_values(self, request, entity_type=None, entity_id=None):
        org = request.user.organization
        fields = CustomField.objects.filter(
            organization=org, entity_type=entity_type, is_active=True,
        )
        field_map = {f.field_key: f for f in fields}

        for key, value in request.data.items():
            if key not in field_map:
                continue
            CustomFieldValue.objects.update_or_create(
                field=field_map[key],
                entity_id=entity_id,
                defaults={'value_json': value, 'entity_type': entity_type},
            )

        return Response({'status': 'ok'})

    @action(
        detail=False, methods=['get'],
        url_path='values/(?P<entity_type>[^/.]+)/(?P<entity_id>[^/.]+)',
        permission_classes=[IsAuthenticated],
    )
    def get_values(self, request, entity_type=None, entity_id=None):
        org = request.user.organization
        fields = CustomField.objects.filter(
            organization=org, entity_type=entity_type, is_active=True,
        )
        values = CustomFieldValue.objects.filter(
            field__in=fields, entity_id=entity_id,
        ).select_related('field')

        result = {v.field.field_key: v.value_json for v in values}
        schema = CustomFieldSerializer(fields, many=True).data
        return Response({'schema': schema, 'values': result})


class OrganizationActionsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='email-test')
    def email_test(self, request):
        """Проверить SMTP подключение."""
        import smtplib
        import ssl

        org = request.user.organization
        host = request.data.get('email_host', org.email_host)
        port = int(request.data.get('email_port', org.email_port))
        user = request.data.get('email_username', org.email_username)
        password = request.data.get('email_password', org.email_password)
        use_tls = request.data.get('email_use_tls', org.email_use_tls)

        if isinstance(use_tls, str):
            use_tls = use_tls.lower() == 'true'

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(host, port, timeout=5) as smtp:
                if use_tls:
                    smtp.starttls(context=context)
                smtp.login(user, password)
            return Response({'ok': True, 'message': 'Подключение успешно'})
        except Exception as exc:
            return Response({'ok': False, 'message': str(exc)}, status=400)


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'city', 'address', 'phone', 'manager', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class BranchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgAdmin]
    serializer_class = BranchSerializer

    def get_queryset(self):
        return Branch.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
