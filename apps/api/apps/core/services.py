def ensure_default_pipeline(organization):
    """Creates a default pipeline with basic stages if none exist."""
    from apps.pipelines.models import Pipeline, PipelineStage

    if Pipeline.objects.filter(organization=organization).exists():
        return
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
