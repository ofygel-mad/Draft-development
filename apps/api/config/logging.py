import json
import logging
import traceback

from django.utils import timezone


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log: dict = {
            'ts': timezone.now().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if record.exc_info:
            log['exception'] = traceback.format_exception(*record.exc_info)
        for key in ('org_id', 'user_id', 'request_id', 'entity_type', 'entity_id', 'path'):
            if hasattr(record, key):
                log[key] = getattr(record, key)
        return json.dumps(log, ensure_ascii=False)


LOGGING_CONFIG: dict = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'structured': {'()': 'config.logging.StructuredFormatter'},
        'simple': {'format': '%(levelname)s %(name)s: %(message)s'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'structured',
        },
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django.db.backends': {'level': 'WARNING', 'propagate': True},
        'celery': {'level': 'INFO', 'propagate': True},
        'apps': {'level': 'DEBUG', 'propagate': True},
    },
}
