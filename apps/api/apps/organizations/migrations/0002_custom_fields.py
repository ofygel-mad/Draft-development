from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomField',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('entity_type', models.CharField(choices=[('customer', 'Клиент'), ('deal', 'Сделка')], max_length=20)),
                ('name', models.CharField(max_length=100)),
                ('field_key', models.SlugField(max_length=100)),
                ('field_type', models.CharField(choices=[('text', 'Текст'), ('number', 'Число'), ('date', 'Дата'), ('select', 'Список'), ('boolean', 'Да/Нет'), ('url', 'Ссылка'), ('phone', 'Телефон')], default='text', max_length=20)),
                ('options', models.JSONField(blank=True, default=list)),
                ('is_required', models.BooleanField(default=False)),
                ('position', models.PositiveSmallIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='custom_fields', to='organizations.organization')),
            ],
            options={'db_table': 'custom_fields', 'ordering': ['entity_type', 'position']},
        ),
        migrations.CreateModel(
            name='CustomFieldValue',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('entity_type', models.CharField(max_length=20)),
                ('entity_id', models.UUIDField(db_index=True)),
                ('value_json', models.JSONField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('field', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='values', to='organizations.customfield')),
            ],
            options={'db_table': 'custom_field_values'},
        ),
        migrations.AlterUniqueTogether(name='customfield', unique_together={('organization', 'entity_type', 'field_key')}),
        migrations.AlterUniqueTogether(name='customfieldvalue', unique_together={('field', 'entity_id')}),
        migrations.AddIndex(model_name='customfieldvalue', index=models.Index(fields=['entity_type', 'entity_id'], name='custom_fiel_entity__778f37_idx')),
    ]
