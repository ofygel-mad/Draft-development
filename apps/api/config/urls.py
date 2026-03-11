from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.core.api.sse_views import SSEView

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/auth/', include('apps.users.api.auth_urls')),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/', include('apps.organizations.api.urls')),
    path('api/v1/', include('apps.users.api.urls')),
    path('api/v1/', include('apps.customers.api.urls')),
    path('api/v1/', include('apps.deals.api.urls')),
    path('api/v1/', include('apps.pipelines.api.urls')),
    path('api/v1/', include('apps.tasks.api.urls')),
    path('api/v1/', include('apps.automations.api.urls')),
    path('api/v1/', include('apps.notifications.api.urls')),
    path('api/v1/', include('apps.activities.api.urls')),
    path('api/v1/', include('apps.audit.api.urls')),
    path('api/v1/', include('apps.imports.api.urls')),
    path('api/v1/', include('apps.reports.api.urls')),
    path('api/v1/sse/', SSEView.as_view(), name='sse'),
    path('health/', include('apps.core.api.health_urls')),
    path('api/v1/spreadsheets/', include('apps.spreadsheets.api.urls')),
]
