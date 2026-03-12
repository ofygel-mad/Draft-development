from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('customers', '0006_contact_fields')]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='follow_up_due_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='response_state',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]
