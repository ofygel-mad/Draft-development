from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('organizations', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('create', 'Создание'), ('update', 'Обновление'), ('delete', 'Удаление'), ('login', 'Вход'), ('logout', 'Выход'), ('export', 'Экспорт'), ('import', 'Импорт')], max_length=20)),
                ('entity_type', models.CharField(db_index=True, max_length=50)),
                ('entity_id', models.UUIDField(blank=True, null=True)),
                ('entity_label', models.CharField(blank=True, max_length=255)),
                ('diff', models.JSONField(blank=True, null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=512)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='users.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='organizations.organization')),
            ],
            options={
                'db_table': 'audit_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(model_name='auditlog', index=models.Index(fields=['organization', '-created_at'], name='audit_logs_organiz_8ce347_idx')),
        migrations.AddIndex(model_name='auditlog', index=models.Index(fields=['organization', 'entity_type', 'entity_id'], name='audit_logs_organiz_2fd4f9_idx')),
        migrations.AddIndex(model_name='auditlog', index=models.Index(fields=['organization', 'actor', '-created_at'], name='audit_logs_organiz_9ac432_idx')),
    ]
