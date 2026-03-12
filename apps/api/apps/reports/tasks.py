from celery import shared_task
from django.utils import timezone

from apps.deals.models import Deal
from apps.notifications.models import Notification
from apps.tasks.models import Task
from apps.users.models import User


@shared_task(queue='retention')
def build_daily_digest_notifications():
    today = timezone.localdate()
    for user in User.objects.filter(is_active=True):
        overdue_tasks = Task.objects.filter(assigned_to=user, is_completed=False, due_at__date__lt=today).count()
        at_risk_deals = Deal.objects.filter(owner=user, is_archived=False).count()
        Notification.objects.create(
            user=user,
            title='Утренний фокус',
            message=f'Просрочено задач: {overdue_tasks}. Сделок под контролем: {at_risk_deals}.',
            type='system',
        )
