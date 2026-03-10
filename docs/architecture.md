# Architecture Overview

## Layers
1. Presentation (React + DRF)
2. Application (services/use-cases)
3. Domain (entities/rules/events)
4. Infrastructure (ORM, Redis, S3, external APIs)
5. Async processing (imports/exports/automations/notifications)
6. Cross-cutting (auth, permissions, audit, logging, metrics)

## Tenancy
- Single DB
- Shared schema
- Organization isolation via `organization_id`
