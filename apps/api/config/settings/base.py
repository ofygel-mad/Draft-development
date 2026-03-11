from pathlib import Path
from datetime import timedelta
import os
from urllib.parse import parse_qs, unquote, urlparse
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parents[3]

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')
DEBUG = os.getenv('DEBUG', '0') == '1'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# Auth
AUTH_USER_MODEL = 'users.User'

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
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
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

# Media (MinIO / S3)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'apps.core.authentication.QueryParamJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/min',
        'user': '2000/hour',
        'auth': '10/min',
        'import': '20/hour',
    },
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.StandardPagination',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.crm_exception_handler',
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'UPDATE_LAST_LOGIN': True,
}

# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

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
}

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
        'BACKEND':  'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
        'OPTIONS':  { 'CLIENT_CLASS': 'django_redis.client.DefaultClient' },
        'TIMEOUT':  300,
    }
}

SENTRY_DSN = os.getenv('SENTRY_DSN', '')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        environment=os.getenv('DJANGO_ENV', 'development'),
        send_default_pii=False,
    )
