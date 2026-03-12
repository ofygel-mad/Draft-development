from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.core.api.search_views import GlobalSearchView
from apps.core.api.sse_views import SSEView
from apps.core.api.api_tokens_views import ApiTokenListCreateView, ApiTokenRevokeView
from apps.core.api.ai_views import AiAssistantView
from apps.core.api.currency_views import ExchangeRatesView
from apps.core.api.bootstrap_views import SessionBootstrapView

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
    path('api/v1/', include('apps.webhooks.api.urls')),
    path('api/v1/search/', GlobalSearchView.as_view(), name='global-search'),
    path('api/v1/sse/', SSEView.as_view(), name='sse'),
    path('api/v1/exchange-rates/', ExchangeRatesView.as_view(), name='exchange-rates'),
    path('api/v1/session/bootstrap/', SessionBootstrapView.as_view(), name='session-bootstrap'),
    path('api/v1/ai/chat/', AiAssistantView.as_view(), name='ai-chat'),
    path('', include('django_prometheus.urls')),
    path('api/v1/api-tokens/', ApiTokenListCreateView.as_view(), name='api-tokens-list'),
    path('api/v1/api-tokens/<uuid:pk>/', ApiTokenRevokeView.as_view(), name='api-token-revoke'),
    path('health/', include('apps.core.api.health_urls')),
    path('api/v1/spreadsheets/', include('apps.spreadsheets.api.urls')),
]
