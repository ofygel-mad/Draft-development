from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('deals', '0003_deal_currency_default_kzt')]

    operations = [
        migrations.AddField(
            model_name='deal',
            name='next_step',
            field=models.CharField(max_length=500, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='deal',
            name='probability',
            field=models.PositiveSmallIntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='deal',
            name='last_activity_at',
            field=models.DateTimeField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name='deal',
            name='loss_reason',
            field=models.CharField(max_length=300, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='deal',
            name='close_forecast_at',
            field=models.DateField(null=True, blank=True),
        ),
    ]
