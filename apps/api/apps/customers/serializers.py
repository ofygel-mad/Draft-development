from rest_framework import serializers
from .models import Customer
from apps.users.serializers import UserShortSerializer
from .services.health_score import compute_health_score


class CustomerListSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)
    health = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'company_name', 'phone', 'email',
                  'bin_iin', 'source', 'status', 'owner', 'created_at', 'health',
                  'follow_up_due_at', 'response_state', 'last_contact_at']


    def get_health(self, obj) -> dict:
        return compute_health_score(obj)


class CustomerSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'company_name', 'phone', 'email',
                  'bin_iin', 'source', 'status', 'notes', 'tags', 'owner',
                  'created_at', 'updated_at', 'last_contact_at',
                  'follow_up_due_at', 'response_state', 'next_action_note']
