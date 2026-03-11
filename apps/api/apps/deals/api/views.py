from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from apps.audit.services import log_action
from apps.automations.services.event_publisher import publish_event
from ..models import Deal
from ..serializers import DealSerializer, DealListSerializer


class DealViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'customer__full_name']
    ordering = ['-created_at']

    def get_queryset(self):
        return Deal.objects.filter(
            organization=self.request.user.organization,
            deleted_at__isnull=True,
        ).select_related(
            'customer', 'stage', 'pipeline', 'owner'
        ).prefetch_related(
            'activities',
            'pipeline__stages',
        )

    def get_serializer_class(self):
        return DealListSerializer if self.action == 'list' else DealSerializer

    def perform_create(self, serializer):
        instance = serializer.save(
            organization=self.request.user.organization,
            owner=self.request.user,
        )
        publish_event(
            organization_id=instance.organization_id,
            event_type='deal.created',
            entity_type='deal',
            entity_id=instance.id,
            actor_id=self.request.user.id,
            payload={
                'stage_id': str(instance.stage_id),
                'pipeline_id': str(instance.pipeline_id),
                'amount': str(instance.amount) if instance.amount else None,
            },
        )
        log_action(
            organization_id=instance.organization_id,
            actor_id=self.request.user.id,
            action='deal.created',
            entity_type='deal',
            entity_id=str(instance.id),
            entity_label=instance.title,
            request=self.request,
        )
        cache.delete(f'dashboard:{instance.organization_id}')

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])

    @action(detail=False, methods=['get'])
    def board(self, request):
        from apps.pipelines.models import Pipeline
        org = request.user.organization
        pipeline_id = request.query_params.get('pipeline_id')

        if pipeline_id:
            pipeline = Pipeline.objects.get(id=pipeline_id, organization=org)
        else:
            pipeline = (
                Pipeline.objects.filter(organization=org, is_default=True).first()
                or Pipeline.objects.filter(organization=org).first()
            )

        if not pipeline:
            from apps.core.services import ensure_default_pipeline
            pipeline = ensure_default_pipeline(org)

        stages = pipeline.stages.all().order_by('position')
        deals = Deal.objects.filter(
            organization=org,
            pipeline=pipeline,
            deleted_at__isnull=True,
        ).select_related('customer', 'owner', 'stage')

        by_stage: dict = {}
        for d in deals:
            sid = str(d.stage_id)
            by_stage.setdefault(sid, [])
            by_stage[sid].append(DealListSerializer(d).data)

        return Response({
            'pipeline': {'id': str(pipeline.id), 'name': pipeline.name},
            'stages': [
                {
                    'id': str(s.id),
                    'name': s.name,
                    'type': s.stage_type,
                    'color': s.color,
                    'deals': by_stage.get(str(s.id), []),
                }
                for s in stages
            ],
        })


    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        deal = self.get_object()
        from apps.activities.models import Activity

        qs = Activity.objects.filter(
            organization=request.user.organization,
            deal=deal,
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
    @action(detail=True, methods=['post'])
    def change_stage(self, request, pk=None):
        deal = self.get_object()
        new_stage_id = request.data.get('stage_id')

        with transaction.atomic():
            from apps.pipelines.models import PipelineStage
            old_stage = deal.stage
            new_stage = PipelineStage.objects.get(id=new_stage_id, pipeline=deal.pipeline)
            deal.stage = new_stage
            if new_stage.stage_type == 'won':
                deal.status = Deal.Status.WON
                deal.closed_at = timezone.now()
            elif new_stage.stage_type == 'lost':
                deal.status = Deal.Status.LOST
                deal.closed_at = timezone.now()
            else:
                deal.status = Deal.Status.OPEN
                deal.closed_at = None
            deal.save()

            publish_event(
                organization_id=deal.organization_id,
                event_type='deal.stage_changed',
                entity_type='deal',
                entity_id=deal.id,
                actor_id=request.user.id,
                payload={
                    'old_stage_id': str(old_stage.id),
                    'new_stage_id': str(new_stage.id),
                    'new_stage_type': new_stage.stage_type,
                    'pipeline_id': str(deal.pipeline_id),
                    'amount': str(deal.amount) if deal.amount else None,
                },
                dedupe_key=f'deal_stage_{deal.id}_{new_stage.id}',
            )
            log_action(
                organization_id=deal.organization_id,
                actor_id=request.user.id,
                action='deal.stage_changed',
                entity_type='deal',
                entity_id=str(deal.id),
                entity_label=deal.title,
                diff={
                    'old_stage_id': str(old_stage.id),
                    'new_stage_id': str(new_stage.id),
                },
                request=request,
            )

            from apps.activities.models import Activity
            Activity.objects.create(
                organization=request.user.organization,
                actor=request.user,
                deal=deal,
                customer=deal.customer,
                type=Activity.Type.STAGE_CHANGE,
                payload={
                    'old_stage': {'id': str(old_stage.id), 'name': old_stage.name},
                    'new_stage': {'id': str(new_stage.id), 'name': new_stage.name},
                },
            )

        return Response(DealSerializer(deal).data)
