from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationView, CustomFieldViewSet

router = DefaultRouter()
router.register(r'custom-fields', CustomFieldViewSet, basename='custom-field')

urlpatterns = [
    path('organization', OrganizationView.as_view(), name='organization'),
    path('', include(router.urls)),
]
