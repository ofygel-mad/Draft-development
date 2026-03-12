from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('imports', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='importjob',
            name='import_type',
            field=models.CharField(
                choices=[
                    ('customer', 'Клиент'),
                    ('deal', 'Сделка'),
                    ('task', 'Задача'),
                    ('spreadsheet', 'Spreadsheet'),
                ],
                default='customer',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='importjob',
            name='status',
            field=models.CharField(
                choices=[
                    ('uploaded', 'Загружен'),
                    ('analyzing', 'Анализ'),
                    ('mapping_required', 'Требуется маппинг'),
                    ('mapping_confirmed', 'Маппинг подтверждён'),
                    ('processing', 'Обработка'),
                    ('completed', 'Завершён'),
                    ('failed', 'Ошибка'),
                    ('cancelled', 'Отменён'),
                ],
                default='uploaded',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='importjob',
            name='finished_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='importjob',
            name='row_errors_json',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='importjob',
            name='started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='importjob',
            name='warnings_json',
            field=models.JSONField(default=list),
        ),
        migrations.RunSQL(
            sql=(
                "UPDATE import_jobs SET status='uploaded' WHERE status='pending';"
                "UPDATE import_jobs SET status='mapping_required' WHERE status='mapping';"
            ),
            reverse_sql=(
                "UPDATE import_jobs SET status='pending' WHERE status='uploaded';"
                "UPDATE import_jobs SET status='mapping' WHERE status='mapping_required';"
            ),
        ),
    ]
