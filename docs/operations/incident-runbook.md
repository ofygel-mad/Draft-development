# Incident Runbook

## Severity

- SEV-1: login broken, data corruption, system-wide write failure
- SEV-2: imports/export broken, dashboard partially unavailable, automation execution degraded
- SEV-3: isolated page issue, non-critical degradation

## Первые 10 минут

1. Зафиксировать UTC time начала инцидента.
2. Назначить incident lead.
3. Остановить rollout если он идёт.
4. Определить blast radius: org-specific или global.
5. Проверить:
   - `/health/`
   - app errors
   - DB saturation
   - Redis saturation
   - Celery backlog
   - recent migrations/deploys

## Типовые решения

### Рост 5xx

- откат последнего деплоя
- временно выключить новые async consumers
- сузить traffic на problem endpoints

### Поломка imports/spreadsheets

- отключить commit/sync actions через feature flag
- оставить preview/review в read-only
- сохранить raw upload artifacts для повторного прогона

### Поломка permissions

- заблокировать чувствительные write endpoints
- включить emergency admin-only mode на affected sections

## После стабилизации

- написать postmortem в течение 24 часов
- добавить regression tests
- обновить release checklist, если инцидент поймал слепую зону
