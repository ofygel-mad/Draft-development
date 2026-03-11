import pytest
from apps.automations.services.condition_evaluator import _apply_operator, evaluate_rule


@pytest.mark.parametrize('op,actual,expected,result', [
    ('eq',           'new',  'new',  True),
    ('eq',           'new',  'old',  False),
    ('neq',          'new',  'old',  True),
    ('contains',     'hello world', 'world', True),
    ('not_contains', 'hello',       'world', True),
    ('gt',           10, 5,   True),
    ('gt',           5,  10,  False),
    ('gte',          10, 10,  True),
    ('lt',           3,  10,  True),
    ('lte',          10, 10,  True),
    ('is_empty',     '',    None, True),
    ('is_empty',     None,  None, True),
    ('is_empty',     'x',   None, False),
    ('is_not_empty', 'x',   None, True),
    ('in',           'a', ['a','b'], True),
    ('in',           'c', ['a','b'], False),
    ('not_in',       'c', ['a','b'], True),
    ('starts_with',  'hello', 'hel', True),
    ('ends_with',    'hello', 'llo', True),
])
def test_apply_operator(op, actual, expected, result):
    assert _apply_operator(op, actual, expected) == result


@pytest.mark.django_db
def test_evaluate_rule_no_conditions(org, user, deal):
    from apps.automations.models import AutomationRule
    rule = AutomationRule.objects.create(
        organization=org, name='Test', trigger_type='deal.created',
        status='active', created_by=user,
    )
    from apps.automations.models import DomainEvent
    from django.utils import timezone
    event = DomainEvent.objects.create(
        organization=org, event_type='deal.created',
        entity_type='deal', entity_id=deal.id,
        occurred_at=timezone.now(),
    )
    ctx = {'deal': {'amount': 100000, 'status': 'open'}}
    assert evaluate_rule(rule, event, ctx) is True


@pytest.mark.django_db
def test_evaluate_rule_with_matching_condition(org, user, deal):
    from apps.automations.models import AutomationRule, AutomationConditionGroup, AutomationCondition
    rule = AutomationRule.objects.create(
        organization=org, name='Test', trigger_type='deal.created', status='active', created_by=user,
    )
    group = AutomationConditionGroup.objects.create(rule=rule, operator='AND')
    AutomationCondition.objects.create(
        rule=rule, group=group, field_path='deal.amount', operator='gt', value_json=50000,
    )
    from apps.automations.models import DomainEvent
    from django.utils import timezone
    event = DomainEvent.objects.create(
        organization=org, event_type='deal.created',
        entity_type='deal', entity_id=deal.id, occurred_at=timezone.now(),
    )
    ctx = {'deal': {'amount': 100000}}
    assert evaluate_rule(rule, event, ctx) is True

    ctx_low = {'deal': {'amount': 10000}}
    assert evaluate_rule(rule, event, ctx_low) is False
