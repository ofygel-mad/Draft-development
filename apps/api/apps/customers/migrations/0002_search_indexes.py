from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0001_initial'),
    ]

    atomic = False

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE EXTENSION IF NOT EXISTS pg_trgm;

            CREATE INDEX IF NOT EXISTS
                customers_full_name_trgm
            ON customers
            USING gin (full_name gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS
                customers_company_name_trgm
            ON customers
            USING gin (company_name gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS
                customers_phone_trgm
            ON customers
            USING gin (phone gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS
                customers_org_created
            ON customers (organization_id, created_at DESC)
            WHERE deleted_at IS NULL;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS customers_full_name_trgm;
            DROP INDEX IF EXISTS customers_company_name_trgm;
            DROP INDEX IF EXISTS customers_phone_trgm;
            DROP INDEX IF EXISTS customers_org_created;
            """,
        ),
    ]
