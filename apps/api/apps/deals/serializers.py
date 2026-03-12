from rest_framework import serializers
from .models import Deal
from apps.users.serializers import UserShortSerializer
from apps.customers.serializers import CustomerListSerializer
from apps.pipelines.serializers import PipelineStageSerializer


class DealListSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)
    customer = CustomerListSerializer(read_only=True)
    stage = PipelineStageSerializer(read_only=True)
    last_activity_at = serializers.SerializerMethodField()
    next_action = serializers.SerializerMethodField()

    def get_last_activity_at(self, obj):
        act = obj.activities.order_by('-created_at').first()
        return act.created_at.isoformat() if act else None

    def get_next_action(self, obj):
        task = obj.tasks.filter(status='open').order_by('due_at').first()
        return task.title if task else None

    class Meta:
        model = Deal
        fields = ['id', 'title', 'amount', 'currency', 'status',
                  'owner', 'customer', 'stage', 'expected_close_date', 'created_at', 'last_activity_at', 'next_action']


class DealSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)
    customer = CustomerListSerializer(read_only=True)
    stage = PipelineStageSerializer(read_only=True)

    customer_id = serializers.PrimaryKeyRelatedField(
        source='customer', queryset=Deal._meta.get_field('customer').remote_field.model.objects.all(), write_only=True, required=False, allow_null=True
    )
    pipeline_id = serializers.PrimaryKeyRelatedField(
        source='pipeline', queryset=Deal._meta.get_field('pipeline').remote_field.model.objects.all(), write_only=True
    )
    stage_id = serializers.PrimaryKeyRelatedField(
        source='stage', queryset=Deal._meta.get_field('stage').remote_field.model.objects.all(), write_only=True
    )

    class Meta:
        model = Deal
        fields = ['id', 'title', 'amount', 'currency', 'status',
                  'owner', 'customer', 'stage', 'pipeline',
                  'customer_id', 'pipeline_id', 'stage_id',
                  'expected_close_date', 'closed_at', 'created_at', 'updated_at']
        extra_kwargs = {
            'pipeline': {'read_only': True},
        }
