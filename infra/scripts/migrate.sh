#!/bin/sh
set -e

cd /app/apps/api

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding automation templates..."
python manage.py seed_automation_templates || true

echo "Done."
