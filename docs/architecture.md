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

## Wave 04-06 additions

- `core` now owns request context, idempotency, bootstrap payload, security middlewares.
- `spreadsheets` is hardened as separate domain with preview, mapping confidence, sync orchestration, conflict policy.
- `reports` now exposes daily focus payload for retention and morning command center.
- `users` provides presence heartbeat/read endpoints for multi-user execution visibility.
- `web` gets stronger token discipline, mobile sticky actions, PWA install path, offline fallback and spreadsheet review UI.
