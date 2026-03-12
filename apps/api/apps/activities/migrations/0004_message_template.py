from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [('activities', '0003_add_customer_created_type')]

    operations = [
        migrations.CreateModel(
            name='MessageTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('channel', models.CharField(choices=[('whatsapp', 'WhatsApp'), ('email', 'Email'), ('call', 'Звонок'), ('general', 'Общий')], default='general', max_length=20)),
                ('name', models.CharField(max_length=255)),
                ('body', models.TextField(help_text='Поддерживает {{customer.full_name}}, {{deal.title}}, {{manager.full_name}}')),
                ('shortcut', models.CharField(blank=True, help_text='/shortcut', max_length=30)),
                ('is_active', models.BooleanField(default=True)),
                ('use_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='users.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='message_templates', to='organizations.organization')),
            ],
            options={
                'db_table': 'message_templates',
                'ordering': ['-use_count', 'name'],
            },
        ),
        migrations.AddIndex(
            model_name='messagetemplate',
            index=models.Index(fields=['organization', 'channel', 'is_active'], name='msgtpl_org_channel_idx'),
        ),
        migrations.AddIndex(
            model_name='messagetemplate',
            index=models.Index(fields=['organization', 'shortcut'], name='msgtpl_shortcut_idx'),
        ),
    ]
