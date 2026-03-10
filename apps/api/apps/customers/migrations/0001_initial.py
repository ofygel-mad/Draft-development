from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('organizations', '0001_initial'),
        ('users', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='customers')),
                ('owner', models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_customers')),
                ('full_name', models.CharField(max_length=255)),
                ('company_name', models.CharField(max_length=255, blank=True)),
                ('phone', models.CharField(max_length=32, blank=True)),
                ('email', models.EmailField(blank=True)),
                ('source', models.CharField(max_length=100, blank=True)),
                ('status', models.CharField(max_length=20, default='new')),
                ('tags', models.JSONField(default=list, blank=True)),
                ('notes', models.TextField(blank=True)),
                ('deleted_at', models.DateTimeField(null=True, blank=True)),
            ],
            options={'db_table': 'customers'},
        ),
        migrations.AddIndex(
            model_name='customer',
            index=models.Index(fields=['organization', 'status'], name='cust_org_status_idx'),
        ),
    ]
