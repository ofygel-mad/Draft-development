# Architecture Overview

## Layers
1. Presentation (React + DRF)
2. Application (services/use-cases)
3. Domain (entities/rules/events)
4. Infrastructure (ORM, Redis, S3, external APIs)
5. Async processing (imports/exports/spreadsheets/automations/notifications)
6. Cross-cutting (auth, permissions, audit, logging, metrics)

## Tenancy
- Single DB
- Shared schema
- Organization isolation via `organization_id`

## Spreadsheet subsystem (foundation)
- Dedicated `apps.spreadsheets` module separates spreadsheet lifecycle from generic imports/exports.
- Versioned entities: document, version, sheet metadata, mapping, row bindings, style snapshot, sync jobs, export jobs.
- Queue isolation: `spreadsheets` queue for heavy workbook analysis/sync and `ai` queue for AI-assisted mapping/anomaly tasks.
- API foundation:
  - `POST /api/v1/spreadsheets/upload/` creates a document + initial version and schedules analysis.
  - `GET /api/v1/spreadsheets/documents/` lists spreadsheet documents (optionally by organization).
  - Export jobs are executed asynchronously via Celery (`exports` queue) with lifecycle states `pending -> running -> completed|failed` and audit event `export` on success.
  - Sync conflict resolution is policy-driven: `manual_review` keeps conflicts (partial result), `crm_wins` converts conflicts to skipped rows, `spreadsheet_wins` converts conflicts to updates.

## Wave 04-06 additions

- `core` now owns request context, idempotency, bootstrap payload, security middlewares.
- `spreadsheets` is hardened as separate domain with preview, mapping confidence, sync orchestration, conflict policy.
- `reports` now exposes daily focus payload for retention and morning command center.
- `users` provides presence heartbeat/read endpoints for multi-user execution visibility.
- `web` gets stronger token discipline, mobile sticky actions, PWA install path, offline fallback and spreadsheet review UI.


## Non-negotiable platform rules

- Backend domain logic lives in `apps/api/apps/*/services`, selectors, tasks and domain modules.
- Frontend must consume API contracts, not invent data semantics ad hoc.
- Cross-cutting concerns go through shared layers only: request context, auth, audit, telemetry, permissions.
- Every new critical flow must define owner, metrics, rollback and failure behavior before release.

## Release rings

1. local dev
2. internal alpha
3. limited pilot organizations
4. general availability

No feature touching spreadsheets, automations, imports or permission logic should jump directly to broad rollout.
