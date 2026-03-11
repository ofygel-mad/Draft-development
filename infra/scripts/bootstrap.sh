#!/usr/bin/env sh
set -eu

echo "==> Копируем .env если не существует"
cp -n .env.example .env 2>/dev/null || true

echo "==> Поднимаем postgres и redis"
docker compose up -d postgres redis

echo "==> Ждём готовности postgres..."
until docker compose exec postgres pg_isready -U crm -d crm 2>/dev/null; do
  printf '.'
  sleep 1
done
echo " ok"

echo "==> Поднимаем все сервисы"
docker compose up --build -d

echo "==> Ждём готовности API..."
until curl -sf http://localhost:8000/health/ > /dev/null 2>&1; do
  printf '.'
  sleep 2
done
echo " ok"

echo "==> Создаём суперпользователя (если нужно)"
docker compose exec api python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(is_superuser=True).exists():
    U.objects.create_superuser(email='admin@crm.local', password='admin123', full_name='Super Admin')
    print('Superuser created: admin@crm.local / admin123')
else:
    print('Superuser already exists')
"

echo ""
echo "✅ CRM готова!"
echo "   Веб:        http://localhost"
echo "   API Docs:   http://localhost/api/docs/"
echo "   Django Admin: http://localhost/django-admin/"
echo "   MinIO:      http://localhost:9001"
