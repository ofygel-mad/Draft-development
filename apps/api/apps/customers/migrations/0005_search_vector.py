from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0004_add_phone_and_created_at_indexes'),
    ]

    atomic = False

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE customers
              ADD COLUMN IF NOT EXISTS search_vector tsvector
              GENERATED ALWAYS AS (
                to_tsvector('russian',
                  coalesce(full_name, '') || ' ' ||
                  coalesce(company_name, '') || ' ' ||
                  coalesce(phone, '') || ' ' ||
                  coalesce(email, '')
                )
              ) STORED;

            CREATE INDEX IF NOT EXISTS
              customers_search_vector_gin
            ON customers
            USING gin (search_vector)
            WHERE deleted_at IS NULL;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS customers_search_vector_gin;
            ALTER TABLE customers DROP COLUMN IF EXISTS search_vector;
            """,
        ),
    ]
