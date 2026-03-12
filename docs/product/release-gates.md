# Release Gates

Фича не уходит в широкий релиз, если не выполнено хоть одно из следующего:

1. Есть owner по продукту и owner по инженерии.
2. Есть список failure paths.
3. Есть rollback plan.
4. Есть измеряемые success metrics.
5. Есть audit/logging/telemetry для критических операций.
6. Есть ручной test sheet для QA и smoke.
7. Для permissions/imports/spreadsheets/automations есть негативные тесты.

Особый запрет:

- нельзя выпускать workflow/automation фичу без idempotency и audit trail
- нельзя выпускать spreadsheet sync без conflict strategy
- нельзя выпускать mobile-only UX без desktop parity или явного product decision
