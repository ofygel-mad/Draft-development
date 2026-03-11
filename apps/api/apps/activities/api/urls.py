from django.urls import path
from .views import ActivityListView, FeedView

urlpatterns = [
    path('activities', ActivityListView.as_view(), name='activities'),
    path('feed/', FeedView.as_view(), name='feed'),
]
