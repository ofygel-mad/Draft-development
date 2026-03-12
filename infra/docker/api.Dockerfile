FROM python:3.12-slim

WORKDIR /app/apps/api

COPY apps/api/requirements /tmp/requirements

# ИСПРАВЛЕНО: prod ставил dev.txt (pytest/ruff/bandit), не prod.txt
ARG ENV=prod
RUN pip install --no-cache-dir \
    -r /tmp/requirements/base.txt \
    $([ "$ENV" = "prod" ] && echo "-r /tmp/requirements/prod.txt" || echo "-r /tmp/requirements/dev.txt")

WORKDIR /app
