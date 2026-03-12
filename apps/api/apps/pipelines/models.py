from django.db import models
from apps.core.models import BaseModel


class Pipeline(BaseModel):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='pipelines')
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'pipelines'

    def __str__(self):
        return self.name


class PipelineStageQuerySet(models.QuerySet):
    @staticmethod
    def _rewrite_kwargs(kwargs: dict) -> dict:
        if 'type' in kwargs and 'stage_type' not in kwargs:
            kwargs = dict(kwargs)
            kwargs['stage_type'] = kwargs.pop('type')
        return kwargs

    def filter(self, *args, **kwargs):
        return super().filter(*args, **self._rewrite_kwargs(kwargs))

    def exclude(self, *args, **kwargs):
        return super().exclude(*args, **self._rewrite_kwargs(kwargs))

    def get(self, *args, **kwargs):
        return super().get(*args, **self._rewrite_kwargs(kwargs))


class PipelineStage(BaseModel):
    class StageType(models.TextChoices):
        OPEN = 'open', 'Open'
        WON = 'won', 'Won'
        LOST = 'lost', 'Lost'

    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=100)
    position = models.PositiveSmallIntegerField(default=0)
    stage_type = models.CharField(max_length=10, choices=StageType.choices, default=StageType.OPEN)
    color = models.CharField(max_length=7, blank=True, default='')

    objects = PipelineStageQuerySet.as_manager()

    class Meta:
        db_table = 'pipeline_stages'
        ordering = ['position']

    @property
    def type(self) -> str:
        return self.stage_type

    @type.setter
    def type(self, value: str) -> None:
        self.stage_type = value

    def __str__(self):
        return f'{self.pipeline.name} / {self.name}'
