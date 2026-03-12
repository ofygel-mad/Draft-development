# Release Readiness Checklist

## Перед релизом

- migrations проверены на staging-like базе
- collectstatic выполняется без ошибок
- celery worker поднимается без missing queues/import errors
- health endpoint возвращает OK
- все feature flags и env variables документированы
- проверены login, dashboard, customer profile, deal profile, tasks, imports, reports
- проверен хотя бы один failure-path на import и automation
- проверено создание организации/приглашение пользователя/права доступа

## После релиза

- 15 минут смотреть error rate и p95
- проверить audit entries на критическом happy-path
- проверить event ingestion по key product events
- проверить очереди celery на backlog и retry storm
