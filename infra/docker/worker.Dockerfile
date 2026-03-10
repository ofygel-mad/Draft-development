FROM python:3.12-slim
WORKDIR /app/apps/api
COPY apps/api/requirements /tmp/requirements
RUN pip install --no-cache-dir -r /tmp/requirements/dev.txt
WORKDIR /app
