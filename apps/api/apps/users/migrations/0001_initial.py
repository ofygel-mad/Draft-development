from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('organizations', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True)),
                ('is_superuser', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='users', null=True, blank=True)),
                ('email', models.EmailField(unique=True)),
                ('full_name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=32, blank=True)),
                ('avatar_url', models.URLField(blank=True, null=True)),
                ('status', models.CharField(max_length=20, default='active')),
                ('is_staff', models.BooleanField(default=False)),
            ],
            options={'db_table': 'users'},
        ),
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('organization', models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='roles')),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=50)),
                ('is_system', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'roles'},
        ),
        migrations.AlterUniqueTogether(
            name='role',
            unique_together={('organization', 'code')},
        ),
    ]
