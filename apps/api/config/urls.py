from django.urls import path, include

urlpatterns = [
    path("api/v1/health/", include("apps.core.api.health_urls")),
]
