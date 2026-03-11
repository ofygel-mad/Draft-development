import pytest


@pytest.mark.django_db
class TestCustomerAPI:
    def test_list_customers(self, api_client, customer):
        r = api_client.get('/api/v1/customers/')
        assert r.status_code == 200
        assert r.data['count'] >= 1

    def test_create_customer(self, api_client, org):
        r = api_client.post('/api/v1/customers/', {
            'full_name': 'New Customer', 'phone': '+77009999999',
            'email': 'new@test.com', 'source': 'website',
        })
        assert r.status_code == 201
        assert r.data['full_name'] == 'New Customer'

    def test_filter_by_status(self, api_client, customer):
        r = api_client.get('/api/v1/customers/?status=new')
        assert r.status_code == 200
        assert all(c['status'] == 'new' for c in r.data['results'])

    def test_filter_by_source(self, api_client, customer):
        r = api_client.get('/api/v1/customers/?source=instagram')
        assert r.status_code == 200
        assert r.data['count'] >= 1

    def test_search(self, api_client, customer):
        r = api_client.get('/api/v1/customers/?search=John')
        assert r.status_code == 200
        assert r.data['count'] >= 1

    def test_soft_delete(self, api_client, customer):
        r = api_client.delete(f'/api/v1/customers/{customer.id}/')
        assert r.status_code == 204
        customer.refresh_from_db()
        assert customer.deleted_at is not None

    def test_bulk_delete(self, api_client, customer):
        r = api_client.post('/api/v1/customers/bulk/', {
            'action': 'delete', 'ids': [str(customer.id)],
        })
        assert r.status_code == 200
        assert r.data['affected'] == 1

    def test_bulk_change_status(self, api_client, customer):
        r = api_client.post('/api/v1/customers/bulk/', {
            'action': 'change_status', 'ids': [str(customer.id)],
            'payload': {'status': 'active'},
        })
        assert r.status_code == 200
        customer.refresh_from_db()
        assert customer.status == 'active'

    def test_cannot_access_other_org(self, api_client, db):
        from apps.organizations.models import Organization
        from apps.customers.models import Customer
        other_org = Organization.objects.create(name='Other', slug='other')
        other_customer = Customer.objects.create(organization=other_org, full_name='Other')
        r = api_client.get(f'/api/v1/customers/{other_customer.id}/')
        assert r.status_code == 404
