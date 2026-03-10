from rest_framework import serializers
from .models import Task
from apps.users.serializers import UserShortSerializer


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserShortSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'priority', 'status',
                  'due_at', 'completed_at', 'assigned_to', 'assigned_to_id',
                  'customer', 'deal', 'created_at']
