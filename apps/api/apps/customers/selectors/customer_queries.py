from apps.customers.models import Customer
from django.db.models import QuerySet, Q
import re


def list_customers(
    *,
    organization_id,
    search: str = '',
    status: str = '',
    source: str = '',
    owner_id=None,
    created_after=None,
    created_before=None,
) -> QuerySet:
    qs = Customer.objects.filter(organization_id=organization_id, deleted_at__isnull=True)
    if search:
        phone_normalized = re.sub(r'[\s\-\(\)\+]', '', search)
        q = (
            Q(full_name__icontains=search)
            | Q(company_name__icontains=search)
            | Q(email__icontains=search)
        )
        if phone_normalized:
            q |= Q(phone__icontains=phone_normalized)
        qs = qs.filter(q)
    if status:
        qs = qs.filter(status=status)
    if source:
        qs = qs.filter(source__icontains=source)
    if owner_id:
        qs = qs.filter(owner_id=owner_id)
    if created_after:
        qs = qs.filter(created_at__date__gte=created_after)
    if created_before:
        qs = qs.filter(created_at__date__lte=created_before)
    return qs.select_related('owner').prefetch_related('activities', 'deals', 'tasks')


def get_customer_by_id(*, organization_id, customer_id) -> Customer:
    return Customer.objects.select_related('owner').get(
        id=customer_id, organization_id=organization_id, deleted_at__isnull=True
    )
