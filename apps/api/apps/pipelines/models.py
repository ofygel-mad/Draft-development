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

    class Meta:
        db_table = 'pipeline_stages'
        ordering = ['position']

    def __str__(self):
        return f'{self.pipeline.name} / {self.name}'
