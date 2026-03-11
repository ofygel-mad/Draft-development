from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0002_search_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='bin_iin',
            field=models.CharField(blank=True, max_length=12, verbose_name='БИН/ИИН'),
        ),
    ]
