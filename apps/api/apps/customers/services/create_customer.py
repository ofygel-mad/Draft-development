from django.db import transaction
from apps.customers.models import Customer


@transaction.atomic
def create_customer(
    *,
    organization_id,
    actor_id,
    full_name: str,
    phone: str = '',
    email: str = '',
    company_name: str = '',
    source: str = '',
    owner_id=None,
) -> Customer:
    customer = Customer.objects.create(
        organization_id=organization_id,
        owner_id=owner_id or actor_id,
        full_name=full_name,
        phone=phone,
        email=email,
        company_name=company_name,
        source=source,
    )
    # publish domain event
    from apps.customers.domain.events import publish_customer_created
    publish_customer_created(customer=customer, actor_id=actor_id)
    return customer
