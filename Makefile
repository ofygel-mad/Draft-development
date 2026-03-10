.PHONY: up down logs api-shell migrate makemigrations test-api

up:
	docker compose up --build -d

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

api-shell:
	docker compose exec api python manage.py shell

migrate:
	docker compose exec api python manage.py migrate

makemigrations:
	docker compose exec api python manage.py makemigrations

test-api:
	docker compose exec api pytest -q
