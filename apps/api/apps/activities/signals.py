from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender='activities.Activity')
def update_contact_timestamps(sender, instance, created, **kwargs):
    if not created:
        return

    now = timezone.now()
    contact_types = (
        'note',
        'call',
        'message',
        'email_sent',
        'email_in',
        'whatsapp',
        'customer_created',
    )
    if instance.type not in contact_types:
        return

    if instance.customer_id:
        from apps.customers.models import Customer

        Customer.objects.filter(pk=instance.customer_id).update(last_contact_at=now)
    if instance.deal_id:
        from apps.deals.models import Deal

        Deal.objects.filter(pk=instance.deal_id).update(last_activity_at=now)


@receiver(post_save, sender='customers.Customer')
def on_customer_created(sender, instance, created, **kwargs):
    if not created:
        return

    from apps.activities.models import Activity

    Activity.objects.create(
        organization=instance.organization,
        customer=instance,
        type=Activity.Type.CUSTOMER_CREATED,
        payload={'full_name': instance.full_name},
    )


@receiver(post_save, sender='deals.Deal')
def on_deal_created(sender, instance, created, **kwargs):
    if not created:
        return

    from apps.activities.models import Activity

    Activity.objects.create(
        organization=instance.organization,
        customer=instance.customer,
        deal=instance,
        type=Activity.Type.DEAL_CREATED,
        payload={'title': instance.title, 'amount': str(instance.amount or 0)},
    )


@receiver(post_save, sender='tasks.Task')
def on_task_status_change(sender, instance, created, **kwargs):
    if created or instance.status != 'done':
        return

    from apps.activities.models import Activity

    Activity.objects.get_or_create(
        organization=instance.organization,
        task=instance,
        type=Activity.Type.TASK_DONE,
        defaults={'payload': {'title': instance.title}},
    )
