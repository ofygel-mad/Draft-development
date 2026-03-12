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


def _invalidate_dashboard_cache(organization_id):
    """Инвалидирует кэш дашборда для всех пользователей организации."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    for uid in User.objects.filter(
        organization_id=organization_id,
    ).values_list('id', flat=True):
        cache.delete(f'dashboard:{organization_id}:{uid}')


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
            action='create',
            entity_type='deal',
            entity_id=str(instance.id),
            entity_label=instance.title,
            request=self.request,
        )
        _invalidate_dashboard_cache(instance.organization_id)

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
        ).select_related('customer', 'owner', 'stage').prefetch_related('activities', 'tasks')

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

    @action(detail=True, methods=['get'], url_path='invoice')
    def invoice(self, request, pk=None):
        """Генерировать PDF счёт для сделки."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import mm
        except ImportError:
            return Response({'error': 'reportlab не установлен. pip install reportlab'}, status=500)

        import io
        from django.http import HttpResponse

        deal = self.get_object()
        org = request.user.organization

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm)

        styles = getSampleStyleSheet()
        amber = colors.HexColor('#D97706')
        gray = colors.HexColor('#6B7280')
        story = []

        header_data = [
            [Paragraph(f'<b>{org.name}</b>', styles['Heading2']), Paragraph(f'<b>СЧЁТ № {str(deal.id)[:8].upper()}</b>', styles['Heading2'])],
            [Paragraph(f'Дата: {deal.created_at.strftime("%d.%m.%Y")}', styles['Normal']), ''],
        ]
        header_table = Table(header_data, colWidths=[85 * mm, 85 * mm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#111827')),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8 * mm))

        divider = Table([['']], colWidths=[170 * mm], rowHeights=[1])
        divider.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), amber)]))
        story.append(divider)
        story.append(Spacer(1, 6 * mm))

        if deal.customer:
            story.append(Paragraph('<b>Получатель:</b>', styles['Normal']))
            story.append(Paragraph(deal.customer.full_name, styles['Heading3']))
            if deal.customer.company_name:
                story.append(Paragraph(deal.customer.company_name, styles['Normal']))
            if deal.customer.phone:
                story.append(Paragraph(deal.customer.phone, styles['Normal']))
            story.append(Spacer(1, 6 * mm))

        currency_sym = {'KZT': '₸', 'RUB': '₽', 'USD': '$', 'EUR': '€'}.get(deal.currency, deal.currency)
        amount_str = f'{float(deal.amount):,.0f} {currency_sym}' if deal.amount else '—'

        table_data = [
            ['№', 'Наименование', 'Сумма'],
            ['1', deal.title, amount_str],
            ['', Paragraph('<b>ИТОГО:</b>', styles['Normal']), Paragraph(f'<b>{amount_str}</b>', styles['Normal'])],
        ]
        t = Table(table_data, colWidths=[10 * mm, 130 * mm, 30 * mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), amber),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#FFFBF5')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, amber),
        ]))
        story.append(t)
        story.append(Spacer(1, 10 * mm))

        story.append(Paragraph(
            f'Выставлен через CRM · {org.name}',
            ParagraphStyle('footer', parent=styles['Normal'], textColor=gray, fontSize=8)
        ))

        doc.build(story)
        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type='application/pdf')
        resp['Content-Disposition'] = f'inline; filename="invoice-{str(deal.id)[:8]}.pdf"'
        return resp
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
            deal.last_activity_at = timezone.now()
            deal.save(update_fields=['stage', 'status', 'closed_at', 'last_activity_at'])

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
                action='update',
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
