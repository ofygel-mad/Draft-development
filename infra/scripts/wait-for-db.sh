#!/usr/bin/env sh
set -eu

# ИСПРАВЛЕНО: хардкод 'postgres' не работает на Railway — парсим из DATABASE_URL
if [ -n "${DATABASE_URL:-}" ]; then
  DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\([^:/]*\).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*:\([0-9]*\)/.*|\1|')
  DB_PORT=${DB_PORT:-5432}
else
  DB_HOST=${POSTGRES_HOST:-postgres}
  DB_PORT=${POSTGRES_PORT:-5432}
fi

echo "Waiting for DB at $DB_HOST:$DB_PORT..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "DB is ready."
