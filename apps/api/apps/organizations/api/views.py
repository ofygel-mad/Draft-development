from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Organization
from ..serializers import OrganizationSerializer


class OrganizationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        return Response(OrganizationSerializer(org).data)

    def patch(self, request):
        org = request.user.organization
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from apps.organizations.models import CustomField, CustomFieldValue


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = ['id', 'name', 'field_key', 'field_type', 'entity_type', 'options', 'is_required', 'position', 'is_active']
        read_only_fields = ['id']


class CustomFieldViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomFieldSerializer

    def get_queryset(self):
        qs = CustomField.objects.filter(organization=self.request.user.organization, is_active=True)
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=False, methods=['post'], url_path='values/(?P<entity_type>[^/.]+)/(?P<entity_id>[^/.]+)')
    def set_values(self, request, entity_type=None, entity_id=None):
        org = request.user.organization
        fields = CustomField.objects.filter(organization=org, entity_type=entity_type, is_active=True)
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

    @action(detail=False, methods=['get'], url_path='values/(?P<entity_type>[^/.]+)/(?P<entity_id>[^/.]+)')
    def get_values(self, request, entity_type=None, entity_id=None):
        org = request.user.organization
        fields = CustomField.objects.filter(organization=org, entity_type=entity_type, is_active=True)
        values = CustomFieldValue.objects.filter(field__in=fields, entity_id=entity_id).select_related('field')

        result = {v.field.field_key: v.value_json for v in values}
        schema = CustomFieldSerializer(fields, many=True).data
        return Response({'schema': schema, 'values': result})
