from .base import *  # noqa: F403
import os

DEBUG = False

SECRET_KEY = os.environ['SECRET_KEY']

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]

SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', '1') == '1'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

CORS_ALLOW_ALL_ORIGINS = False

DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = os.getenv('S3_BUCKET', 'crm-media')
AWS_S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT', '')
AWS_ACCESS_KEY_ID = os.getenv('S3_ACCESS_KEY', '')
AWS_SECRET_ACCESS_KEY = os.getenv('S3_SECRET_KEY', '')
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = 'private'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

LOGGING['handlers']['console']['level'] = 'WARNING'  # noqa
