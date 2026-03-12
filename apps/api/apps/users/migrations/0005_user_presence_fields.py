from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('users', '0004_add_user_status_choices')]

    operations = [
        migrations.AddField(model_name='user', name='last_seen_at', field=models.DateTimeField(null=True, blank=True, db_index=True)),
        migrations.AddField(model_name='user', name='presence_state', field=models.CharField(max_length=16, default='offline', db_index=True)),
    ]
