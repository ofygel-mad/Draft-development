.PHONY: dev prod migrate makemigrations shell createsuperuser logs-api logs-worker test lint-frontend build-frontend import-fixtures reset-db

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
	cd apps/web && npm run lint

build-frontend:
	cd apps/web && npm run build

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
