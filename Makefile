.PHONY: dev prod migrate makemigrations shell createsuperuser logs-api logs-worker test lint-frontend build-frontend import-fixtures reset-db seed-automations migrate-all setup-phase4 psql backup restore worker-logs

dev:
	docker-compose up --build

prod:
	docker-compose -f docker-compose.prod.yml up -d --build

migrate:
	docker-compose exec api python manage.py migrate

makemigrations:
	docker-compose exec api python manage.py makemigrations

shell:
	docker-compose exec api python manage.py shell_plus

createsuperuser:
	docker-compose exec api python manage.py createsuperuser

logs-api:
	docker-compose logs -f api

logs-worker:
	docker-compose logs -f worker

test:
	docker-compose exec api python manage.py test --verbosity=2

lint-frontend:
	pnpm --dir apps/web run lint

build-frontend:
	pnpm --dir apps/web run build

import-fixtures:
	docker-compose exec api python manage.py loaddata fixtures/demo.json

reset-db:
	docker-compose down -v && docker-compose up -d postgres && sleep 3 && $(MAKE) migrate


seed-automations:
	docker compose exec api python manage.py seed_automation_templates

migrate-all:
	docker compose exec api python manage.py makemigrations automations notifications audit organizations
	docker compose exec api python manage.py migrate

setup-phase4: migrate-all seed-automations
	@echo "Phase 4 setup complete ✓"


psql:
	docker compose exec postgres psql -U crm crm

backup:
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker compose exec -T postgres pg_dump -U crm crm | gzip > backup_$$TIMESTAMP.sql.gz; \
	echo "Backup saved: backup_$$TIMESTAMP.sql.gz"

restore:
	@echo "Usage: make restore FILE=backup_20240101_120000.sql.gz"
	@test -n "$(FILE)" || (echo "FILE is required" && exit 1)
	gunzip -c $(FILE) | docker compose exec -T postgres psql -U crm crm

worker-logs:
	docker compose logs -f worker beat
