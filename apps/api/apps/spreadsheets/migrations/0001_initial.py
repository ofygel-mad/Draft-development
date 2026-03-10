import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SpreadsheetDocument",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("title", models.CharField(max_length=255)),
                ("original_filename", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=100)),
                ("uploaded_by_user_id", models.UUIDField(db_index=True)),
                ("storage_key", models.CharField(max_length=500)),
            ],
        ),
        migrations.CreateModel(
            name="SpreadsheetVersion",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("version_number", models.PositiveIntegerField()),
                (
                    "source_type",
                    models.CharField(
                        choices=[
                            ("uploaded", "Uploaded"),
                            ("regenerated", "Regenerated"),
                            ("synced", "Synced"),
                            ("ai_modified", "AI Modified"),
                        ],
                        default="uploaded",
                        max_length=20,
                    ),
                ),
                ("storage_key", models.CharField(max_length=500)),
                ("checksum", models.CharField(blank=True, max_length=128)),
                ("created_by_user_id", models.UUIDField(db_index=True)),
                (
                    "document",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="spreadsheets.spreadsheetdocument"),
                ),
            ],
            options={"ordering": ["-version_number"], "unique_together": {("document", "version_number")}},
        ),
        migrations.CreateModel(
            name="SpreadsheetSheet",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("position", models.PositiveIntegerField()),
                ("max_row", models.PositiveIntegerField(default=0)),
                ("max_col", models.PositiveIntegerField(default=0)),
                ("detected_table_ranges", models.JSONField(blank=True, default=list)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "version",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sheets", to="spreadsheets.spreadsheetversion"),
                ),
            ],
            options={"ordering": ["position"], "unique_together": {("version", "name")}},
        ),
        migrations.CreateModel(
            name="SpreadsheetMapping",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("sheet_name", models.CharField(max_length=255)),
                ("range_ref", models.CharField(max_length=100)),
                ("entity_type", models.CharField(max_length=64)),
                ("mapping", models.JSONField(default=dict)),
                (
                    "sync_mode",
                    models.CharField(
                        choices=[
                            ("import_only", "Import only"),
                            ("bidirectional", "Bidirectional"),
                            ("export_template", "Export template"),
                        ],
                        default="import_only",
                        max_length=20,
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mappings", to="spreadsheets.spreadsheetdocument"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SpreadsheetStyleSnapshot",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("sheet_name", models.CharField(max_length=255)),
                ("range_ref", models.CharField(max_length=100)),
                ("style", models.JSONField(default=dict)),
                ("merged_ranges", models.JSONField(blank=True, default=list)),
                ("column_widths", models.JSONField(blank=True, default=dict)),
                ("row_heights", models.JSONField(blank=True, default=dict)),
                ("conditional_formats", models.JSONField(blank=True, default=list)),
                ("data_validations", models.JSONField(blank=True, default=list)),
                (
                    "version",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="style_snapshots", to="spreadsheets.spreadsheetversion"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SpreadsheetSyncJob",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                (
                    "direction",
                    models.CharField(choices=[("to_db", "To DB"), ("from_db", "From DB"), ("bidirectional", "Bidirectional")], max_length=20),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("running", "Running"), ("succeeded", "Succeeded"), ("failed", "Failed")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                (
                    "document",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sync_jobs", to="spreadsheets.spreadsheetdocument"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SpreadsheetExportJob",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("running", "Running"), ("succeeded", "Succeeded"), ("failed", "Failed")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("storage_key", models.CharField(blank=True, max_length=500)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                (
                    "document",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="export_jobs", to="spreadsheets.spreadsheetdocument"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SpreadsheetBinding",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("entity_type", models.CharField(max_length=64)),
                ("entity_id", models.UUIDField(db_index=True)),
                ("sheet_name", models.CharField(max_length=255)),
                ("row_index", models.PositiveIntegerField()),
                ("binding_key", models.CharField(max_length=255)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                (
                    "mapping",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bindings", to="spreadsheets.spreadsheetmapping"),
                ),
            ],
            options={"unique_together": {("mapping", "sheet_name", "row_index")}},
        ),
    ]
