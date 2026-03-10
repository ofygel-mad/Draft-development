from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models import Pipeline, PipelineStage
from ..serializers import PipelineSerializer, PipelineStageSerializer
from apps.core.services import ensure_default_pipeline


class PipelineViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PipelineSerializer

    def get_queryset(self):
        return Pipeline.objects.filter(
            organization=self.request.user.organization,
            is_archived=False,
        ).prefetch_related('stages')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
