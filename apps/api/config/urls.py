from django.urls import path, include

urlpatterns = [
    path("api/v1/health/", include("apps.core.api.health_urls")),
    path("api/v1/spreadsheets/", include("apps.spreadsheets.api.urls")),
]
