# Success Metrics

## North-star

`Weekly Active Managed Revenue` - сумма активных сделок/клиентских контуров, по которым команда реально ведёт работу в системе, а не в Excel, мессенджерах и памяти менеджера.

## Обязательные продуктовые метрики

### Activation

- time-to-first-customer-created < 10 минут
- time-to-first-deal-created < 15 минут
- first dashboard interaction rate > 80%
- first quick action usage > 45%

### Operational adoption

- WAU / MAU > 0.65
- не менее 70% активных пользователей завершают хотя бы 1 задачу в неделю
- не менее 60% активных аккаунтов открывают dashboard 3+ раза в неделю

### CRM integrity

- доля сделок без owner < 1%
- доля клиентов без последней активности < 5%
- доля задач без due date < 10%
- доля импортов, завершившихся без ручного review при низкой confidence, равна 0%

### Spreadsheet superiority

- median time import -> reviewed -> committed < 6 минут
- sync failure rate < 1%
- export parity complaints = 0 как целевая планка

### Reliability

- API availability >= 99.9%
- p95 page load dashboard < 2.5s на нормальной сети
- p95 critical API < 500ms

## Минимальный event-set для аналитики

- auth_login_success
- dashboard_today_focus_opened
- customer_created
- deal_created
- task_completed
- import_started
- import_review_opened
- import_committed
- spreadsheet_sync_completed
- export_started
- command_palette_action_run
- automation_enabled
