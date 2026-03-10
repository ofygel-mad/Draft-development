from rest_framework import serializers
from .models import Deal
from apps.users.serializers import UserShortSerializer
from apps.customers.serializers import CustomerListSerializer
from apps.pipelines.serializers import PipelineStageSerializer


class DealListSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)
    customer = CustomerListSerializer(read_only=True)
    stage = PipelineStageSerializer(read_only=True)

    class Meta:
        model = Deal
        fields = ['id', 'title', 'amount', 'currency', 'status',
                  'owner', 'customer', 'stage', 'expected_close_date', 'created_at']


class DealSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)
    customer = CustomerListSerializer(read_only=True)
    stage = PipelineStageSerializer(read_only=True)

    class Meta:
        model = Deal
        fields = ['id', 'title', 'amount', 'currency', 'status',
                  'owner', 'customer', 'stage', 'pipeline',
                  'expected_close_date', 'closed_at', 'created_at', 'updated_at']
