from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0001_api_tokens'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='IdempotencyKey',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('key', models.CharField(max_length=128, db_index=True)),
                ('method', models.CharField(max_length=16)),
                ('path', models.CharField(max_length=255)),
                ('request_hash', models.CharField(max_length=128)),
                ('response_code', models.PositiveIntegerField(blank=True, null=True)),
                ('response_body', models.JSONField(default=dict, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='idempotency_keys', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('key', 'user', 'method', 'path')}},
        ),
        migrations.AddIndex(
            model_name='idempotencykey',
            index=models.Index(fields=['user', 'created_at'], name='core_idempo_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='idempotencykey',
            index=models.Index(fields=['expires_at'], name='core_idempo_expires_idx'),
        ),
    ]
