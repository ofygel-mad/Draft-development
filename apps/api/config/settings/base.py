from pathlib import Path
from datetime import timedelta
import os
from urllib.parse import parse_qs, unquote, urlparse
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from celery.schedules import crontab
from config.logging import LOGGING_CONFIG as APP_LOGGING_CONFIG

BASE_DIR = Path(__file__).resolve().parents[3]

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')
DEBUG = os.getenv('DEBUG', '0') == '1'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# Auth
AUTH_USER_MODEL = 'users.User'

INSTALLED_APPS = [
    'django_prometheus',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    'django_celery_beat',
    'django_celery_results',
    # CRM
    'apps.core',
    'apps.organizations',
    'apps.users',
    'apps.customers',
    'apps.deals',
    'apps.pipelines',
    'apps.tasks',
    'apps.activities',
    'apps.automations',
    'apps.imports',
    'apps.exports',
    'apps.spreadsheets',
    'apps.notifications',
    'apps.audit',
    'apps.reports',
    'apps.webhooks',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'apps.core.middleware.request_context.RequestContextMiddleware',
    'apps.core.middleware.idempotency.IdempotencyKeyMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

def _database_config_from_env() -> dict:
    database_url = os.getenv('DATABASE_URL', '').strip()
    if database_url:
        parsed = urlparse(database_url)
        query = parse_qs(parsed.query)
        options = {'connect_timeout': 5}
        sslmode = query.get('sslmode', [None])[0]
        if sslmode:
            options['sslmode'] = sslmode

        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/') or 'crm',
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or 'postgres',
            'PORT': str(parsed.port or '5432'),
            'OPTIONS': options,
        }

    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'crm'),
        'USER': os.getenv('POSTGRES_USER', 'crm'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'crm'),
        'HOST': os.getenv('POSTGRES_HOST', 'postgres'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
        'OPTIONS': {'connect_timeout': 5},
    }


DATABASES = {'default': _database_config_from_env()}

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
LANGUAGE_CODE = 'ru-ru'
USE_I18N = True

# Media (MinIO / S3)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'apps.core.authentication.QueryParamJWTAuthentication',
        'apps.core.authentication.ApiTokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/min',
        'user': '2000/hour',
        'auth': '10/min',
        'import': '5/minute',
        'search': '60/min',
        'bulk': '20/min',
        'export': '12/min',
        'write-sensitive': '60/hour',
    },
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.StandardPagination',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG and os.getenv('DJANGO_ENV', 'development') != 'production'
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', '1') == '1'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', '1') == '1'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

CONTENT_SECURITY_POLICY = {'DIRECTIVES': {'default-src': ("'self'",), 'img-src': ("'self'", 'data:', 'blob:', 'https:'), 'script-src': ("'self'", "'unsafe-inline'"), 'style-src': ("'self'", "'unsafe-inline'"), 'connect-src': ("'self'", 'https:', 'wss:'), 'font-src': ("'self'", 'data:')}}

# Celery
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_QUEUES = {
    'default': {},
    'imports': {},
    'exports': {},
    'automations': {},
    'notifications': {},
    'webhooks': {},
    'retention': {},
    'analytics': {},
    'spreadsheets': {},
}

CELERY_TASK_ROUTES = {'apps.spreadsheets.tasks.*': {'queue': 'spreadsheets'}, 'apps.notifications.tasks.*': {'queue': 'notifications'}, 'apps.automations.tasks.*': {'queue': 'automations'}, 'apps.reports.tasks.*': {'queue': 'analytics'}}

CELERY_BEAT_SCHEDULE = {
    'process-scheduled-automations': {
        'task': 'apps.automations.tasks.process_scheduled_automations',
        'schedule': crontab(minute='*/5'),
    },
}

# Email
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', '1') == '1'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@crm.local')

# Spectacular
SPECTACULAR_SETTINGS = {
    'TITLE': 'CRM API',
    'VERSION': '1.0.0',
}


CACHES = {
    'default': {
        'BACKEND':  'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
        'OPTIONS':  {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,
        },
        'TIMEOUT':  300,
    }
}

SENTRY_DSN = os.getenv('SENTRY_DSN', '').strip()
SENTRY_ENVIRONMENT = os.getenv('SENTRY_ENVIRONMENT', os.getenv('DJANGO_ENV', 'development'))
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.15')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.05')),
        send_default_pii=False,
    )

IDEMPOTENCY_KEY_TTL_SECONDS = int(os.getenv('IDEMPOTENCY_KEY_TTL_SECONDS', '86400'))
SPREADSHEET_MAX_PREVIEW_ROWS = int(os.getenv('SPREADSHEET_MAX_PREVIEW_ROWS', '50'))
SPREADSHEET_MAX_ANALYSIS_SAMPLE_ROWS = int(os.getenv('SPREADSHEET_MAX_ANALYSIS_SAMPLE_ROWS', '500'))
MOBILE_OFFLINE_CACHE_VERSION = os.getenv('MOBILE_OFFLINE_CACHE_VERSION', 'v2')


LOGGING = APP_LOGGING_CONFIG

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
