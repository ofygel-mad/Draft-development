## Что меняется

<!-- 3-7 строк, без воды -->

## Почему это нужно продукту

<!-- какую продуктовую дыру закрывает -->

## Затронутые области

- [ ] auth
- [ ] dashboard
- [ ] customers
- [ ] deals
- [ ] tasks
- [ ] activities
- [ ] reports
- [ ] spreadsheets/import-export
- [ ] automations
- [ ] notifications
- [ ] audit
- [ ] settings/organization
- [ ] search/command-palette
- [ ] mobile/PWA
- [ ] permissions/security
- [ ] observability/ops

## Проверки перед merge

- [ ] `pnpm run lint:web`
- [ ] `pnpm run typecheck:web`
- [ ] `pnpm run migrate:plan`
- [ ] `pnpm run check:api`
- [ ] `pytest -q apps/api/tests`
- [ ] локально проверены happy-path и failure-path
- [ ] добавлены/обновлены метрики, логи или audit trail где это критично
- [ ] добавлены/обновлены тесты на сломанный сценарий
- [ ] добавлен скрин/видео если менялся UX

## Риски

<!-- перечислить реальные риски, а не "none" ради красоты -->

## Rollback

<!-- как откатить без импровизации -->
