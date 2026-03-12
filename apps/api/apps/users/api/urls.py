from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PresenceHeartbeatView, TeamPresenceView

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = router.urls + [
    path('team/presence/heartbeat', PresenceHeartbeatView.as_view()),
    path('team/presence', TeamPresenceView.as_view()),
]
