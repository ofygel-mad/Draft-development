#!/usr/bin/env sh
set -eu

DB_HOST="${POSTGRES_HOST:-${PGHOST:-postgres}}"
DB_PORT="${POSTGRES_PORT:-${PGPORT:-5432}}"

if [ -n "${DATABASE_URL:-}" ]; then
  DB_FROM_URL="$(python - <<'PY'
import os
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(url)
host = parsed.hostname or ""
port = parsed.port or ""
print(f"{host}:{port}")
PY
)"

  URL_HOST="${DB_FROM_URL%:*}"
  URL_PORT="${DB_FROM_URL#*:}"

  if [ -n "$URL_HOST" ]; then
    DB_HOST="$URL_HOST"
  fi

  if [ -n "$URL_PORT" ] && [ "$URL_PORT" != "$DB_FROM_URL" ]; then
    DB_PORT="$URL_PORT"
  fi
fi

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done

echo "PostgreSQL is reachable."
