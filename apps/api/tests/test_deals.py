import pytest


@pytest.mark.django_db
class TestDealAPI:
    def test_list_deals(self, api_client, deal):
        r = api_client.get('/api/v1/deals/')
        assert r.status_code == 200
        assert r.data['count'] >= 1

    def test_create_deal(self, api_client, customer, pipeline):
        stage = pipeline.stages.first()
        r = api_client.post('/api/v1/deals/', {
            'title': 'New Deal', 'amount': 50000, 'currency': 'RUB',
            'customer_id': str(customer.id),
            'pipeline_id': str(pipeline.id),
            'stage_id': str(stage.id),
        })
        assert r.status_code == 201

    def test_change_stage(self, api_client, deal, pipeline):
        stages = list(pipeline.stages.order_by('position'))
        if len(stages) < 2:
            pytest.skip('Need at least 2 stages')
        next_stage = stages[1]
        r = api_client.post(f'/api/v1/deals/{deal.id}/change_stage/', {'stage_id': str(next_stage.id)})
        assert r.status_code == 200
        deal.refresh_from_db()
        assert deal.stage_id == next_stage.id

    def test_board(self, api_client, deal):
        r = api_client.get('/api/v1/deals/board/')
        assert r.status_code == 200
        assert 'stages' in r.data

    def test_activities(self, api_client, deal):
        r = api_client.get(f'/api/v1/deals/{deal.id}/activities/')
        assert r.status_code == 200

    def test_soft_delete(self, api_client, deal):
        r = api_client.delete(f'/api/v1/deals/{deal.id}/')
        assert r.status_code == 204
        deal.refresh_from_db()
        assert deal.deleted_at is not None
