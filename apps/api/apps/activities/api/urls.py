from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActivityListView, FeedView, MessageTemplateViewSet

router = DefaultRouter()
router.register('message-templates', MessageTemplateViewSet, basename='message-templates')

urlpatterns = [
    path('activities', ActivityListView.as_view(), name='activities'),
    path('feed/', FeedView.as_view(), name='feed'),
    path('', include(router.urls)),
]
