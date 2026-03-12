from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activities', '0002_add_email_whatsapp_types'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activity',
            name='type',
            field=models.CharField(
                choices=[
                    ('note', 'Заметка'),
                    ('call', 'Звонок'),
                    ('message', 'Сообщение'),
                    ('email_sent', 'Email отправлен'),
                    ('email_in', 'Email получен'),
                    ('whatsapp', 'WhatsApp'),
                    ('status_change', 'Смена статуса'),
                    ('stage_change', 'Смена стадии'),
                    ('deal_created', 'Сделка создана'),
                    ('task_created', 'Задача создана'),
                    ('task_done', 'Задача выполнена'),
                    ('document_sent', 'Документ отправлен'),
                    ('customer_created', 'Клиент добавлен'),
                ],
                max_length=30,
            ),
        ),
    ]
