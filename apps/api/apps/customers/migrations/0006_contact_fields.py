from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('customers', '0005_search_vector')]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='last_contact_at',
            field=models.DateTimeField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='next_action_at',
            field=models.DateTimeField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='next_action_note',
            field=models.CharField(max_length=500, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='customer',
            name='stalled_reason',
            field=models.CharField(max_length=200, blank=True, default=''),
            preserve_default=False,
        ),
    ]
