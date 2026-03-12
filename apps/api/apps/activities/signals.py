from django.db.models.signals import post_save
from django.dispatch import receiver


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
def on_task_done(sender, instance, created, update_fields=None, **kwargs):
    if created or instance.status != 'done':
        return

    if update_fields is not None and 'status' not in update_fields:
        return

    from apps.activities.models import Activity

    Activity.objects.get_or_create(
        organization=instance.organization,
        task=instance,
        type=Activity.Type.TASK_DONE,
        defaults={'payload': {'title': instance.title}},
    )
