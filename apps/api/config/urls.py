from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    # Auth
    path('api/v1/auth/', include('apps.users.api.auth_urls')),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Resources
    path('api/v1/', include('apps.organizations.api.urls')),
    path('api/v1/', include('apps.users.api.urls')),
    path('api/v1/', include('apps.customers.api.urls')),
    path('api/v1/', include('apps.deals.api.urls')),
    path('api/v1/', include('apps.pipelines.api.urls')),
    path('api/v1/', include('apps.tasks.api.urls')),
    path('api/v1/', include('apps.activities.api.urls')),
    path('api/v1/', include('apps.imports.api.urls')),
    path('api/v1/', include('apps.reports.api.urls')),
    # Health
    path('health/', include('apps.core.api.health_urls')),
    # Spreadsheets (existing)
    path('api/v1/spreadsheets/', include('apps.spreadsheets.api.urls')),
]
