"""
python manage.py seed_automation_templates

Заполняет таблицу automation_templates встроенными шаблонами.
Запускать после миграций и при обновлениях.
"""
from django.core.management.base import BaseCommand
from apps.automations.models import AutomationTemplate

TEMPLATES = [
    {
        'code': 'new_lead_task',
        'name': 'Задача на нового клиента',
        'description': 'При создании клиента автоматически создаётся задача «Позвонить клиенту».',
        'trigger_type': 'customer.created',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'create_task',
                'config_json': {
                    'title': 'Позвонить клиенту {{full_name}}',
                    'description': 'Новый клиент создан. Выйдите на связь в течение 24 часов.',
                    'priority': 'high',
                    'due_in_days': 1,
                    'assign_to': 'owner',
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'deal_stage_notify',
        'name': 'Уведомление при смене стадии',
        'description': 'Уведомляет владельца сделки при изменении стадии.',
        'trigger_type': 'deal.stage_changed',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'send_notification',
                'config_json': {
                    'title': 'Сделка перешла на новую стадию',
                    'body': 'Сделка «{{title}}» переведена в стадию {{stage_name}}.',
                    'recipient_ids': [],  # owner
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'overdue_task_note',
        'name': 'Заметка при просрочке задачи',
        'description': 'Создаёт заметку на клиента, если задача просрочена.',
        'trigger_type': 'task.overdue',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'create_note',
                'config_json': {
                    'body': '⚠️ Задача «{{title}}» просрочена. Требуется внимание.',
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'won_deal_note',
        'name': 'Поздравительная заметка при выигрыше',
        'description': 'При переводе сделки в статус "Выиграно" создаётся заметка.',
        'trigger_type': 'deal.stage_changed',
        'default_conditions': [
            {
                'operator': 'AND',
                'conditions': [
                    {'field_path': 'entity.stage_type', 'operator': 'eq', 'value_json': 'won'},
                ],
            },
        ],
        'default_actions': [
            {
                'action_type': 'create_note',
                'config_json': {
                    'body': '🎉 Сделка выиграна! Сумма: {{amount}} руб.',
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'new_customer_lead_status',
        'name': 'Установить статус Lead новому клиенту',
        'description': 'При создании клиента без указания источника устанавливает статус lead.',
        'trigger_type': 'customer.created',
        'default_conditions': [
            {
                'operator': 'AND',
                'conditions': [
                    {'field_path': 'entity.status', 'operator': 'eq', 'value_json': 'lead'},
                ],
            },
        ],
        'default_actions': [
            {
                'action_type': 'create_task',
                'config_json': {
                    'title': 'Квалифицировать лида: {{full_name}}',
                    'priority': 'medium',
                    'due_in_days': 3,
                    'assign_to': 'owner',
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'deal_stalled_notify_owner',
        'name': 'Сделка зависла — уведомить менеджера',
        'description': 'Если сделка 5+ дней без движения, отправить уведомление владельцу.',
        'trigger_type': 'deal.stalled',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'send_notification',
                'config_json': {
                    'title': 'Сделка зависла: {{deal.title}}',
                    'body': 'Нет активности {{deal.days_silent}} дней. Проверьте сделку и обновите статус.',
                    'recipient_ids': [],
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'deal_stalled_create_task',
        'name': 'Сделка зависла — создать задачу на касание',
        'description': 'Если сделка 5+ дней без движения, создать задачу для менеджера.',
        'trigger_type': 'deal.stalled',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'create_task',
                'config_json': {
                    'title': 'Связаться по сделке: {{deal.title}}',
                    'due_in_days': 1,
                    'assign_to': 'owner',
                    'priority': 'high',
                },
                'position': 0,
            },
        ],
    },
    {
        'code': 'followup_due_create_task',
        'name': 'Follow-up просрочен — создать задачу',
        'description': 'Когда наступает дата follow-up по клиенту, создать задачу.',
        'trigger_type': 'customer.follow_up_due',
        'default_conditions': [],
        'default_actions': [
            {
                'action_type': 'create_task',
                'config_json': {
                    'title': 'Follow-up: {{customer.full_name}}',
                    'due_in_days': 0,
                    'assign_to': 'owner',
                    'priority': 'high',
                },
                'position': 0,
            },
        ],
    }
]


class Command(BaseCommand):
    help = 'Заполняет встроенные шаблоны автоматизаций'

    def handle(self, *args, **options):
        created = updated = 0
        for tpl in TEMPLATES:
            obj, is_new = AutomationTemplate.objects.update_or_create(
                code=tpl['code'],
                defaults={
                    'name': tpl['name'],
                    'description': tpl['description'],
                    'trigger_type': tpl['trigger_type'],
                    'default_conditions': tpl['default_conditions'],
                    'default_actions': tpl['default_actions'],
                    'is_active': True,
                },
            )
            if is_new:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f'Done: {created} created, {updated} updated'
        ))
