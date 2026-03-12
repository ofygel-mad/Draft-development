from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_membership_branch'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Активный'),
                    ('inactive', 'Неактивный'),
                    ('suspended', 'Приостановлен'),
                ],
                default='active',
                max_length=20,
            ),
        ),
    ]
