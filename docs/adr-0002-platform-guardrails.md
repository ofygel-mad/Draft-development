# ADR-0002: Platform Guardrails for CRM Evolution

## Статус
Accepted

## Контекст

Проект быстро растёт по нескольким осям одновременно: CRM-core, spreadsheet intelligence, automations, mobile/PWA, team execution. Без жёстких правил он расползётся в несогласованные страницы, сервисы и дубли бизнес-логики.

## Решение

1. `apps/api/apps/*` остаётся единственной точкой доменной логики.
2. Нельзя класть бизнес-логику в DRF view кроме orchestration и HTTP concerns.
3. Нельзя дублировать один и тот же расчёт одновременно в frontend и backend. Источник истины всегда backend.
4. Все новые критические операции обязаны иметь:
   - audit trail
   - request id
   - permission check
   - failure-path handling
5. Все новые страницы web обязаны иметь:
   - empty state
   - loading state
   - error state
   - responsive state
6. Новые фоновые процессы обязаны быть idempotent.
7. Все интеграции с import/export/spreadsheets проходят через отдельные service layers.
8. Любая новая продуктовая сущность обязана быть доступна для global search и command palette только после появления owner, status, timestamps и audit fields.

## Последствия

- ниже скорость хаотических фич
- выше предсказуемость релизов
- меньше архитектурного мусора, который потом приходится героически разгребать
