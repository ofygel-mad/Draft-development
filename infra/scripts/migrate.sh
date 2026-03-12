#!/usr/bin/env sh
set -eu
cd /app/apps/api
echo "Running migrations..."
python manage.py migrate --noinput
echo "Migrations complete."
