from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0001_initial'),
    ]

    atomic = False

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS
                tasks_org_assignee_status
            ON tasks (organization_id, assigned_to_id, status)
            WHERE status = 'open';

            CREATE INDEX IF NOT EXISTS
                tasks_org_due_at
            ON tasks (organization_id, due_at)
            WHERE status = 'open' AND due_at IS NOT NULL;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS tasks_org_assignee_status;
            DROP INDEX IF EXISTS tasks_org_due_at;
            """,
        ),
    ]
