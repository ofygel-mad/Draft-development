# CRM Platform Monorepo

SaaS-ready CRM monorepo with:
- **Frontend**: React + TypeScript + Vite (`apps/web`)
- **Backend**: Django + DRF (`apps/api`)
- **Async**: Celery + Redis (`apps/worker` logical role)
- **Data**: PostgreSQL, S3-compatible storage (MinIO for local)
- **Infra**: Docker Compose + Nginx (`infra`)
- **Contracts**: OpenAPI-first typed client (`packages/openapi-client`)

## Repository layout

```text
apps/
  web/
  admin-docs/
  api/
  worker/
packages/
  ui/
  config/
  tsconfig/
  openapi-client/
  shared-types/
infra/
  docker/
  nginx/
  postgres/
  redis/
  scripts/
docs/
.github/
```

## Quick start

1. Copy env values if needed:
   ```bash
   cp .env.example .env
   ```
2. Start services:
   ```bash
   make dev
   ```
3. Open:
   - Web: http://localhost:5173
   - API: http://localhost:8000/api/v1/health/
   - Nginx: http://localhost


## Local commands from repository root

If you prefer running tools from the repo root instead of changing directories:

- Frontend scripts (proxy to `apps/web`):
  ```bash
  pnpm run install:web
  pnpm run dev
  pnpm run build
  ```
- Backend dependencies (proxy to `apps/api/requirements`):
  ```bash
  pip install -r requirements/dev.txt
  ```

## Architectural principles

- Versioned API (`/api/v1/*`)
- Multi-tenant by `organization_id` (shared-schema strategy)
- View/Serializer/Service/Selector separation
- Domain events + async handlers through Celery
- OpenAPI as contract source of truth
