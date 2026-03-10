CUSTOMER_CREATED = 'customer.created'
CUSTOMER_UPDATED = 'customer.updated'


def publish_customer_created(*, customer, actor_id):
    """Publish domain event. In future — use event bus."""
    try:
        from apps.activities.models import Activity
        Activity.objects.create(
            organization_id=customer.organization_id,
            actor_id=actor_id,
            customer=customer,
            type=Activity.Type.NOTE,
            payload={'note': f'Клиент создан'},
        )
    except Exception:
        pass
