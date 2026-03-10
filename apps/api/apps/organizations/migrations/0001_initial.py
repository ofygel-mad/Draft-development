from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Organization',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=255)),
                ('slug', models.SlugField(max_length=120, unique=True)),
                ('mode', models.CharField(max_length=20, default='basic')),
                ('industry', models.CharField(max_length=50, default='other')),
                ('company_size', models.CharField(max_length=20, default='1_5')),
                ('timezone', models.CharField(max_length=64, default='UTC')),
                ('currency', models.CharField(max_length=3, default='RUB')),
                ('logo_url', models.URLField(blank=True, null=True)),
                ('onboarding_completed', models.BooleanField(default=False)),
            ],
            options={'db_table': 'organizations'},
        ),
        migrations.CreateModel(
            name='OrganizationCapability',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('organization', models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='capabilities')),
                ('capability_code', models.CharField(max_length=100)),
                ('enabled', models.BooleanField(default=True)),
            ],
            options={'db_table': 'organization_capabilities'},
        ),
        migrations.AlterUniqueTogether(
            name='organizationcapability',
            unique_together={('organization', 'capability_code')},
        ),
    ]
