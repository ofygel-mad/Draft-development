from rest_framework import serializers
from .models import Customer
from apps.users.serializers import UserShortSerializer


class CustomerListSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'company_name', 'phone', 'email',
                  'source', 'status', 'owner', 'created_at']


class CustomerSerializer(serializers.ModelSerializer):
    owner = UserShortSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'company_name', 'phone', 'email',
                  'source', 'status', 'notes', 'tags', 'owner',
                  'created_at', 'updated_at']
