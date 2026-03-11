from rest_framework import serializers
from .models import Activity
from apps.users.serializers import UserShortSerializer


class ActivityCustomerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()


class ActivityDealSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserShortSerializer(read_only=True)
    customer = ActivityCustomerSerializer(read_only=True)
    deal = ActivityDealSerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ['id', 'type', 'payload', 'actor', 'customer', 'deal', 'created_at']
