import io
import pytest


@pytest.mark.django_db
class TestImportAPI:
    def test_upload_csv(self, api_client, tmp_path):
        csv_content = 'full_name,phone,email\nИван Иванов,+77001234567,ivan@test.com\nПётр Петров,+77007654321,petr@test.com\n'
        csv_file = io.BytesIO(csv_content.encode('utf-8-sig'))
        csv_file.name = 'test.csv'
        r = api_client.post('/api/v1/imports/upload/', {'file': csv_file, 'import_type': 'customer'}, format='multipart')
        assert r.status_code == 201
        assert r.data['status'] in ('pending', 'mapping')

    def test_upload_no_file(self, api_client):
        r = api_client.post('/api/v1/imports/upload/', {}, format='multipart')
        assert r.status_code == 400

    def test_list_jobs(self, api_client):
        r = api_client.get('/api/v1/imports/')
        assert r.status_code == 200
