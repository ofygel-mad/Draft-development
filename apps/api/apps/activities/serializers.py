from rest_framework import serializers
from .models import Activity
from apps.users.serializers import UserShortSerializer


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserShortSerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ['id', 'type', 'payload', 'actor', 'created_at']
