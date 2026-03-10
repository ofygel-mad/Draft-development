import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("spreadsheets", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="spreadsheetdocument",
            name="status",
            field=models.CharField(
                choices=[
                    ("uploaded", "Uploaded"),
                    ("analyzing", "Analyzing"),
                    ("ready", "Ready"),
                    ("sync_error", "Sync error"),
                    ("archived", "Archived"),
                ],
                default="uploaded",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="spreadsheetdocument",
            name="current_version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="spreadsheets.spreadsheetversion",
            ),
        ),
        migrations.AlterField(
            model_name="spreadsheetversion",
            name="source_type",
            field=models.CharField(
                choices=[
                    ("uploaded", "Uploaded"),
                    ("regenerated", "Regenerated"),
                    ("synced_from_db", "Synced from DB"),
                    ("ai_modified", "AI Modified"),
                ],
                default="uploaded",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="spreadsheetmapping",
            name="sync_mode",
            field=models.CharField(
                choices=[
                    ("import_only", "Import only"),
                    ("export_only", "Export only"),
                    ("bidirectional", "Bidirectional"),
                    ("template_only", "Template only"),
                ],
                default="import_only",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="spreadsheetmapping",
            name="created_by_user_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="spreadsheetmapping",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="spreadsheetsyncjob",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("running", "Running"),
                    ("completed", "Completed"),
                    ("partial", "Partial"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="spreadsheetsyncjob",
            name="mapping",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sync_jobs",
                to="spreadsheets.spreadsheetmapping",
            ),
        ),
        migrations.AddField(
            model_name="spreadsheetsyncjob",
            name="error_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="spreadsheetsyncjob",
            name="created_by_user_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name="spreadsheetexportjob",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="spreadsheetexportjob",
            name="storage_key",
        ),
        migrations.AddField(
            model_name="spreadsheetexportjob",
            name="error_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="spreadsheetexportjob",
            name="output_storage_key",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="spreadsheetexportjob",
            name="created_by_user_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="spreadsheetexportjob",
            name="version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="export_jobs",
                to="spreadsheets.spreadsheetversion",
            ),
        ),
        migrations.AddField(
            model_name="spreadsheetstylesnapshot",
            name="filters",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="spreadsheetstylesnapshot",
            name="freeze_panes",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name="SpreadsheetAIAnalysis",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "analysis_type",
                    models.CharField(
                        choices=[
                            ("mapping_suggestion", "Mapping suggestion"),
                            ("anomaly_report", "Anomaly report"),
                            ("formula_explanation", "Formula explanation"),
                            ("sync_recommendation", "Sync recommendation"),
                        ],
                        max_length=50,
                    ),
                ),
                ("result", models.JSONField(blank=True, default=dict)),
                ("confidence", models.DecimalField(blank=True, decimal_places=3, max_digits=4, null=True)),
                (
                    "document",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ai_analyses", to="spreadsheets.spreadsheetdocument"),
                ),
                (
                    "version",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ai_analyses", to="spreadsheets.spreadsheetversion"),
                ),
            ],
        ),
    ]
