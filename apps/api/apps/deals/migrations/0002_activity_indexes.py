from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('deals', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                deals_org_pipeline_stage
            ON deals (organization_id, pipeline_id, stage_id)
            WHERE deleted_at IS NULL AND status = 'open';

            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                deals_org_status_closed
            ON deals (organization_id, status, closed_at DESC)
            WHERE deleted_at IS NULL;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS deals_org_pipeline_stage;
            DROP INDEX IF EXISTS deals_org_status_closed;
            """,
        ),
    ]
