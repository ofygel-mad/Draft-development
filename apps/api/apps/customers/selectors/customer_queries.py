from apps.customers.models import Customer
from django.db.models import QuerySet


def list_customers(*, organization_id, search: str = '', status: str = '', owner_id=None) -> QuerySet:
    qs = Customer.objects.filter(organization_id=organization_id, deleted_at__isnull=True)
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(full_name__icontains=search)
            | Q(company_name__icontains=search)
            | Q(phone__icontains=search)
            | Q(email__icontains=search)
        )
    if status:
        qs = qs.filter(status=status)
    if owner_id:
        qs = qs.filter(owner_id=owner_id)
    return qs.select_related('owner')


def get_customer_by_id(*, organization_id, customer_id) -> Customer:
    return Customer.objects.select_related('owner').get(
        id=customer_id, organization_id=organization_id, deleted_at__isnull=True
    )
