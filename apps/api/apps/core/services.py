from django.core.cache import cache


def get_dashboard_cache_version(organization_id) -> int:
    return int(cache.get(f'dashboard_version:{organization_id}', 1))


def bump_dashboard_cache_version(organization_id) -> None:
    key = f'dashboard_version:{organization_id}'
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 2, timeout=None)


def ensure_default_pipeline(organization):
    """Creates a default pipeline with basic stages if none exist."""
    from apps.pipelines.models import Pipeline, PipelineStage

    existing = Pipeline.objects.filter(organization=organization).first()
    if existing:
        return existing
    pipeline = Pipeline.objects.create(
        organization=organization,
        name='Основная воронка',
        is_default=True,
    )
    stages = [
        ('Новый лид', 0, 'open', '#6B7280'),
        ('Контакт', 1, 'open', '#3B82F6'),
        ('Переговоры', 2, 'open', '#F59E0B'),
        ('Выиграно', 3, 'won', '#10B981'),
        ('Проиграно', 4, 'lost', '#EF4444'),
    ]
    PipelineStage.objects.bulk_create([
        PipelineStage(pipeline=pipeline, name=n, position=p, stage_type=t, color=c)
        for n, p, t, c in stages
    ])
    return pipeline
