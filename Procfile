web: cd apps/api && python manage.py migrate --noinput && python manage.py collectstatic --noinput --clear && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --worker-class gevent --timeout 120 --max-requests 1000 --max-requests-jitter 50
worker: cd apps/api && celery -A config worker -l info -Q default,imports,exports,automations,notifications,spreadsheets,webhooks,retention,analytics -c 2
beat: cd apps/api && celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
