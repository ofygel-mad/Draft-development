from django.utils import timezone


def compute_health_score(customer) -> dict:
    """
    Возвращает {"score": 0-100, "band": "green"|"yellow"|"red", "factors": {...}}
    """
    now = timezone.now()
    score = 0
    factors = {}

    last_activity = (
        customer.activities
        .order_by('-created_at')
        .values_list('created_at', flat=True)
        .first()
    )
    if last_activity:
        days_ago = (now - last_activity).days
        factors['last_touch_days'] = days_ago
        if days_ago <= 7:
            score += 40
        elif days_ago <= 30:
            score += 20
    else:
        factors['last_touch_days'] = None

    deals = list(customer.deals.filter(deleted_at__isnull=True).values('status'))
    open_deals = sum(1 for d in deals if d['status'] == 'open')
    won_deals = sum(1 for d in deals if d['status'] == 'won')
    factors['open_deals'] = open_deals
    factors['won_deals'] = won_deals
    if open_deals:
        score += 25
    if won_deals:
        score += 15

    overdue = customer.tasks.filter(status='open', due_at__lt=now).count()
    factors['overdue_tasks'] = overdue
    if overdue == 0:
        score += 20

    score = min(score, 100)

    if score >= 70:
        band = 'green'
    elif score >= 40:
        band = 'yellow'
    else:
        band = 'red'

    return {'score': score, 'band': band, 'factors': factors}
