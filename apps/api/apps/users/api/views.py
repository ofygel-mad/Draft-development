from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from ..models import User
from ..serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'email']

    def get_queryset(self):
        return User.objects.filter(
            organization=self.request.user.organization,
        ).order_by('full_name')
