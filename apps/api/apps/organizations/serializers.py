from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'mode', 'industry', 'company_size',
                  'timezone', 'currency', 'logo_url', 'onboarding_completed',
                  'created_at']
