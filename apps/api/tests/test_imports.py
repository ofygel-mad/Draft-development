import io
import pytest

from apps.imports.models import ImportJob


@pytest.mark.django_db
class TestImportAPI:
    def test_upload_csv_via_legacy_upload_endpoint(self, api_client):
        csv_content = 'full_name,phone,email\nИван Иванов,+77001234567,ivan@test.com\n'
        csv_file = io.BytesIO(csv_content.encode('utf-8-sig'))
        csv_file.name = 'test.csv'
        r = api_client.post('/api/v1/imports/upload/', {'file': csv_file, 'import_type': 'customer'}, format='multipart')
        assert r.status_code == 201
        assert r.data['status'] == ImportJob.Status.ANALYZING

    def test_upload_csv_via_canonical_endpoint_with_plural_alias(self, api_client):
        csv_content = 'full_name,phone,email\nПётр Петров,+77007654321,petr@test.com\n'
        csv_file = io.BytesIO(csv_content.encode('utf-8-sig'))
        csv_file.name = 'test.csv'
        r = api_client.post('/api/v1/imports/', {'file': csv_file, 'import_type': 'customers'}, format='multipart')
        assert r.status_code == 201
        assert r.data['import_type'] == ImportJob.ImportType.CUSTOMER

    def test_upload_no_file(self, api_client):
        r = api_client.post('/api/v1/imports/upload/', {}, format='multipart')
        assert r.status_code == 400

    def test_list_jobs(self, api_client):
        r = api_client.get('/api/v1/imports/')
        assert r.status_code == 200

    def test_confirm_mapping_accepts_mapping_alias(self, api_client, user):
        job = ImportJob.objects.create(
            organization=user.organization,
            created_by=user,
            import_type=ImportJob.ImportType.CUSTOMER,
            status=ImportJob.Status.MAPPING_REQUIRED,
            file_name='x.csv',
        )
        r = api_client.post(f'/api/v1/imports/{job.id}/mapping/', {'mapping': {'name': 'full_name'}}, format='json')
        assert r.status_code == 200
        job.refresh_from_db()
        assert job.status == ImportJob.Status.MAPPING_CONFIRMED
        assert job.column_mapping == {'name': 'full_name'}

    def test_start_is_idempotent_for_processing(self, api_client, user):
        job = ImportJob.objects.create(
            organization=user.organization,
            created_by=user,
            import_type=ImportJob.ImportType.CUSTOMER,
            status=ImportJob.Status.PROCESSING,
            file_name='x.csv',
        )
        r = api_client.post(f'/api/v1/imports/{job.id}/start/', {}, format='json')
        assert r.status_code == 200
        assert r.data['status'] == ImportJob.Status.PROCESSING

    def test_status_payload_shape(self, api_client, user):
        job = ImportJob.objects.create(
            organization=user.organization,
            created_by=user,
            import_type=ImportJob.ImportType.CUSTOMER,
            status=ImportJob.Status.MAPPING_REQUIRED,
            file_name='x.csv',
            total_rows=10,
            imported_rows=2,
            failed_rows=1,
            warnings_json=['w1'],
            row_errors_json=[{'row': 2, 'error': 'bad phone'}],
        )
        r = api_client.get(f'/api/v1/imports/{job.id}/status/')
        assert r.status_code == 200
        assert 'counts' in r.data
        assert 'percent' in r.data
        assert r.data['can_confirm_mapping'] is True
