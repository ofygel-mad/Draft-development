import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Play, Pause, Trash2, ChevronRight,
  UserPlus, TrendingUp, CheckSquare, AlertCircle, ArrowRight,
  MessageSquare, Bell, Globe, RefreshCw, X,
  Filter, Layers,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Drawer } from '../../shared/ui/Drawer';
import { toast } from 'sonner';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';

interface Condition {
  field_path: string;
  operator: string;
  value_json: string | number | null;
}

interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

interface RuleAction {
  action_type: string;
  config_json: Record<string, unknown>;
  position: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  condition_groups: ConditionGroup[];
  actions: RuleAction[];
  executions_count: number;
  last_executed_at: string | null;
  created_at: string;
}

const TRIGGERS = [
  { value: 'customer.created', label: 'Клиент создан', icon: UserPlus, color: '#10B981' },
  { value: 'deal.created', label: 'Сделка создана', icon: TrendingUp, color: '#3B82F6' },
  { value: 'deal.stage_changed', label: 'Сделка сменила этап', icon: ArrowRight, color: '#F59E0B' },
  { value: 'deal.stalled', label: 'Сделка зависла (5+ дней)', icon: AlertCircle, color: '#EF4444' },
  { value: 'task.created', label: 'Задача создана', icon: CheckSquare, color: '#8B5CF6' },
  { value: 'task.overdue', label: 'Задача просрочена', icon: AlertCircle, color: '#EF4444' },
  { value: 'customer.follow_up_due', label: 'Follow-up просрочен', icon: Bell, color: '#D97706' },
];

const FIELDS_BY_TRIGGER: Record<string, { value: string; label: string; type: 'text' | 'number' | 'select' }[]> = {
  'deal.stalled': [
    { value: 'deal.amount', label: 'Сумма сделки', type: 'number' },
    { value: 'deal.days_silent', label: 'Дней без касания', type: 'number' },
  ],
  'customer.follow_up_due': [
    { value: 'customer.response_state', label: 'Статус ответа', type: 'text' },
  ],
  'customer.created': [
    { value: 'customer.source', label: 'Источник клиента', type: 'text' },
    { value: 'customer.status', label: 'Статус клиента', type: 'select' },
  ],
  'deal.created': [
    { value: 'deal.amount', label: 'Сумма сделки', type: 'number' },
    { value: 'customer.source', label: 'Источник клиента', type: 'text' },
  ],
  'deal.stage_changed': [
    { value: 'deal.amount', label: 'Сумма сделки', type: 'number' },
    { value: 'customer.source', label: 'Источник клиента', type: 'text' },
    { value: 'customer.status', label: 'Статус клиента', type: 'select' },
  ],
  'task.created': [
    { value: 'task.priority', label: 'Приоритет задачи', type: 'select' },
  ],
};

const OPERATORS_BY_TYPE = {
  text: [{ v: 'eq', l: '=' }, { v: 'neq', l: '≠' }, { v: 'contains', l: 'содержит' }, { v: 'is_empty', l: 'пусто' }],
  number: [{ v: 'eq', l: '=' }, { v: 'neq', l: '≠' }, { v: 'gt', l: '>' }, { v: 'gte', l: '>=' }, { v: 'lt', l: '<' }, { v: 'lte', l: '<=' }],
  select: [{ v: 'eq', l: '=' }, { v: 'neq', l: '≠' }],
};

const ACTION_TYPES = [
  {
    value: 'create_task', label: 'Создать задачу', icon: CheckSquare, color: '#3B82F6',
    fields: [{ key: 'title_template', label: 'Заголовок задачи', placeholder: 'Связаться с {{customer.full_name}}' },
      { key: 'due_in_hours', label: 'Срок (часов)', placeholder: '24', type: 'number' }],
  },
  {
    value: 'create_note', label: 'Добавить заметку', icon: MessageSquare, color: '#8B5CF6',
    fields: [{ key: 'body_template', label: 'Текст заметки', placeholder: 'Автоматически создано' }],
  },
  {
    value: 'send_internal_notification', label: 'Уведомить пользователя', icon: Bell, color: '#F59E0B',
    fields: [{ key: 'title_template', label: 'Заголовок', placeholder: 'Новое событие' },
      { key: 'body_template', label: 'Текст', placeholder: 'Сделка {{deal.title}} обновлена' }],
  },
  {
    value: 'update_field', label: 'Обновить поле', icon: RefreshCw, color: '#10B981',
    fields: [{ key: 'field', label: 'Поле', placeholder: 'status' },
      { key: 'value', label: 'Значение', placeholder: 'hot' }],
  },
  {
    value: 'change_deal_stage', label: 'Сменить этап сделки', icon: ArrowRight, color: '#EF4444',
    fields: [{ key: 'stage_id', label: 'ID этапа', placeholder: 'uuid этапа' }],
  },
  {
    value: 'webhook', label: 'Вебхук', icon: Globe, color: '#6B7280',
    fields: [{ key: 'url', label: 'URL', placeholder: 'https://...' }],
  },
];

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Активна', bg: '#D1FAE5', color: '#065F46' },
  paused: { label: 'Пауза', bg: '#FEF3C7', color: '#92400E' },
  draft: { label: 'Черновик', bg: '#F3F4F6', color: '#6B7280' },
  archived: { label: 'Архив', bg: '#F3F4F6', color: '#6B7280' },
};

function emptyCondition(): Condition {
  return { field_path: '', operator: 'eq', value_json: '' };
}
function emptyGroup(): ConditionGroup {
  return { operator: 'AND', conditions: [emptyCondition()] };
}
function emptyAction(type: string): RuleAction {
  return { action_type: type, config_json: {}, position: 0 };
}

function TriggerSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {TRIGGERS.map((t) => {
        const Icon = t.icon;
        const active = value === t.value;
        return (
          <motion.button
            key={t.value}
            onClick={() => onChange(t.value)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 'var(--radius-md)', border: `1.5px solid ${active ? t.color : 'var(--color-border)'}`,
              background: active ? `${t.color}12` : 'var(--color-bg-elevated)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: `${t.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={14} style={{ color: t.color }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: active ? 600 : 400,
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}>
              {t.label}
            </span>
            {active && <ChevronRight size={13} style={{ marginLeft: 'auto', color: t.color }} />}
          </motion.button>
        );
      })}
    </div>
  );
}

function ConditionRow({
  condition, triggerType, onChange, onRemove, canRemove,
}: {
  condition: Condition; triggerType: string;
  onChange: (c: Condition) => void; onRemove: () => void; canRemove: boolean;
}) {
  const fields = FIELDS_BY_TRIGGER[triggerType] ?? [];
  const field = fields.find((f) => f.value === condition.field_path);
  const ops = OPERATORS_BY_TYPE[field?.type ?? 'text'];

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        value={condition.field_path}
        onChange={(e) => onChange({ ...condition, field_path: e.target.value, operator: 'eq', value_json: '' })}
        className="crm-input" style={{ flex: 2, fontSize: 12 }}
      >
        <option value="">Выберите поле...</option>
        {fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="crm-input" style={{ flex: 1, fontSize: 12 }}
      >
        {ops.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
        <input
          value={String(condition.value_json ?? '')}
          onChange={(e) => onChange({ ...condition, value_json: e.target.value })}
          placeholder="Значение"
          className="crm-input" style={{ flex: 2, fontSize: 12 }}
        />
      )}
      {canRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 4, borderRadius: 4,
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function ConditionBuilder({
  groups, triggerType, onChange,
}: {
  groups: ConditionGroup[]; triggerType: string; onChange: (g: ConditionGroup[]) => void;
}) {
  const updateGroup = (idx: number, g: ConditionGroup) => {
    const next = [...groups]; next[idx] = g; onChange(next);
  };
  const removeGroup = (idx: number) => onChange(groups.filter((_, i) => i !== idx));
  const addGroup = () => onChange([...groups, emptyGroup()]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map((group, gi) => (
        <motion.div
          key={gi}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['AND', 'OR'] as const).map((op) => (
                <button
                  key={op}
                  onClick={() => updateGroup(gi, { ...group, operator: op })}
                  style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    borderColor: group.operator === op ? 'var(--color-amber)' : 'var(--color-border)',
                    background: group.operator === op ? 'var(--color-amber-light)' : 'transparent',
                    color: group.operator === op ? 'var(--color-amber)' : 'var(--color-text-muted)',
                  }}
                >{op}</button>
              ))}
            </div>
            {groups.length > 1 && (
              <button
                onClick={() => removeGroup(gi)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.conditions.map((cond, ci) => (
              <ConditionRow
                key={ci}
                condition={cond}
                triggerType={triggerType}
                onChange={(c) => {
                  const conds = [...group.conditions]; conds[ci] = c;
                  updateGroup(gi, { ...group, conditions: conds });
                }}
                onRemove={() => {
                  const conds = group.conditions.filter((_, i) => i !== ci);
                  updateGroup(gi, { ...group, conditions: conds });
                }}
                canRemove={group.conditions.length > 1}
              />
            ))}
          </div>

          <button
            onClick={() => updateGroup(gi, { ...group, conditions: [...group.conditions, emptyCondition()] })}
            style={{
              marginTop: 8, fontSize: 12, color: 'var(--color-amber)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0,
            }}
          >
            + Добавить условие
          </button>
        </motion.div>
      ))}

      <button
        onClick={addGroup}
        style={{
          fontSize: 12, color: 'var(--color-text-muted)', background: 'none',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', padding: '8px', fontFamily: 'var(--font-body)',
        }}
      >
        + Добавить группу условий (OR)
      </button>
    </div>
  );
}

function ActionCard({
  action, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  action: RuleAction; index: number;
  onChange: (a: RuleAction) => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  isFirst: boolean; isLast: boolean;
}) {
  const cfg = ACTION_TYPES.find((t) => t.value === action.action_type);
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      style={{
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden', background: 'var(--color-bg-elevated)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-muted)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              background: 'none', border: 'none',
              cursor: isFirst ? 'default' : 'pointer', color: isFirst ? 'var(--color-border)' : 'var(--color-text-muted)',
              padding: 0, lineHeight: 1,
            }}
          >▲</button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              background: 'none', border: 'none',
              cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--color-border)' : 'var(--color-text-muted)',
              padding: 0, lineHeight: 1,
            }}
          >▼</button>
        </div>
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: `${cfg.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={13} style={{ color: cfg.color }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{index + 1}. {cfg.label}</span>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cfg.fields.map((f) => (
          <div key={f.key}>
            <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>
              {f.label}
            </label>
            <input
              value={String(action.config_json[f.key] ?? '')}
              onChange={(e) => onChange({ ...action, config_json: { ...action.config_json, [f.key]: e.target.value } })}
              placeholder={f.placeholder}
              type={f.type === 'number' ? 'number' : 'text'}
              className="crm-input" style={{ fontSize: 12, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ActionBuilder({
  actions, onChange,
}: { actions: RuleAction[]; onChange: (a: RuleAction[]) => void }) {
  const [addOpen, setAddOpen] = useState(false);

  const update = (idx: number, a: RuleAction) => { const n = [...actions]; n[idx] = a; onChange(n); };
  const remove = (idx: number) => onChange(actions.filter((_, i) => i !== idx));
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const n = [...actions]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; onChange(n);
  };
  const moveDown = (idx: number) => {
    if (idx === actions.length - 1) return;
    const n = [...actions]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; onChange(n);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {actions.map((a, i) => (
          <ActionCard
            key={i} action={a} index={i}
            onChange={(updated) => update(i, updated)}
            onRemove={() => remove(i)}
            onMoveUp={() => moveUp(i)}
            onMoveDown={() => moveDown(i)}
            isFirst={i === 0} isLast={i === actions.length - 1}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-muted)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Выберите действие</span>
              <button
                onClick={() => setAddOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              ><X size={13} /></button>
            </div>
            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {ACTION_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <motion.button
                    key={t.value}
                    onClick={() => { onChange([...actions, emptyAction(t.value)]); setAddOpen(false); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-elevated)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, background: `${t.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={12} style={{ color: t.color }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!addOpen && (
        <button
          onClick={() => setAddOpen(true)}
          style={{
            fontSize: 12, color: 'var(--color-amber)', background: 'var(--color-amber-subtle)',
            border: '1px dashed var(--color-amber)', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', padding: '9px', fontFamily: 'var(--font-body)', fontWeight: 500,
          }}
        >
          + Добавить действие
        </button>
      )}
    </div>
  );
}

function LivePreview({ triggerType, groups, actions }: {
  triggerType: string; groups: ConditionGroup[]; actions: RuleAction[];
}) {
  const trigger = TRIGGERS.find((t) => t.value === triggerType);
  const hasConditions = groups.some((g) => g.conditions.some((c) => c.field_path));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', padding: 14, fontSize: 13,
        color: 'var(--color-text-secondary)', lineHeight: 1.7,
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>
        Предпросмотр правила
      </div>
      {!triggerType ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Выберите триггер...</span>
      ) : (
        <>
          <span>Когда </span>
          <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
            {trigger?.label ?? triggerType}
          </span>
          {hasConditions && (
            <>
              <span> и выполняются условия</span>
            </>
          )}
          {actions.length > 0 && (
            <>
              <span>, то: </span>
              {actions.map((a, i) => {
                const cfg = ACTION_TYPES.find((t) => t.value === a.action_type);
                return (
                  <span key={i}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {cfg?.label}
                    </span>
                    {i < actions.length - 1 && <span style={{ color: 'var(--color-text-muted)' }}>, </span>}
                  </span>
                );
              })}
            </>
          )}
          .
        </>
      )}
    </motion.div>
  );
}

function BuilderDrawer({
  open, onClose,
}: {
  open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<'trigger' | 'conditions' | 'actions'>('trigger');
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [groups, setGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const createRule = useMutation({
    mutationFn: async () => {
      const rule = await api.post('/automations/', {
        name: name || `Правило ${triggerType}`,
        trigger_type: triggerType,
        status: 'active',
      });
      const ruleId = (rule as { id: string }).id;
      const validGroups = groups
        .map((g) => ({ ...g, conditions: g.conditions.filter((c) => c.field_path) }))
        .filter((g) => g.conditions.length > 0);
      if (validGroups.length > 0) {
        await api.post(`/automations/${ruleId}/conditions/`, { groups: validGroups });
      }
      if (actions.length > 0) {
        await api.post(`/automations/${ruleId}/actions/`, { actions });
      }
      return rule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Автоматизация создана');
      onClose();
      setStep('trigger');
      setName('');
      setTriggerType('');
      setGroups([emptyGroup()]);
      setActions([]);
    },
    onError: () => toast.error('Ошибка при создании'),
  });

  const STEPS = [
    { id: 'trigger', label: 'Триггер', icon: Zap },
    { id: 'conditions', label: 'Условия', icon: Filter },
    { id: 'actions', label: 'Действия', icon: Layers },
  ] as const;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Конструктор автоматизации"
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setShowPreview((v) => !v)}
            style={{
              fontSize: 12, color: 'var(--color-text-muted)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {showPreview ? 'Скрыть' : 'Предпросмотр'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step !== 'trigger' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep(step === 'actions' ? 'conditions' : 'trigger')}
              >
                Назад
              </Button>
            )}
            {step !== 'actions' ? (
              <Button
                size="sm"
                onClick={() => setStep(step === 'trigger' ? 'conditions' : 'actions')}
                disabled={!triggerType}
              >
                Далее
              </Button>
            ) : (
              <Button size="sm" loading={createRule.isPending} onClick={() => createRule.mutate()}>
                Создать правило
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название правила..."
          className="crm-input"
          style={{ fontSize: 15, fontWeight: 500 }}
        />

        <div style={{
          display: 'flex', gap: 2, padding: 3, background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-md)',
        }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '6px 10px', border: 'none', cursor: 'pointer', borderRadius: 7,
                  fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: 'var(--font-body)',
                  background: active ? 'var(--color-bg-elevated)' : 'transparent',
                  color: active ? 'var(--color-amber)' : done ? 'var(--color-success)' : 'var(--color-text-muted)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Icon size={13} />{s.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {step === 'trigger' && (
              <TriggerSelector value={triggerType} onChange={setTriggerType} />
            )}
            {step === 'conditions' && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, marginTop: 0 }}>
                  Условия опциональны. Если не добавлять — правило срабатывает всегда.
                </p>
                <ConditionBuilder groups={groups} triggerType={triggerType} onChange={setGroups} />
              </div>
            )}
            {step === 'actions' && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, marginTop: 0 }}>
                  Добавьте одно или несколько действий. Выполняются по порядку.
                </p>
                <ActionBuilder actions={actions} onChange={setActions} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showPreview && (
            <LivePreview triggerType={triggerType} groups={groups} actions={actions} />
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  );
}

export default function AutomationsPage() {
  useDocumentTitle('Автоматизации');
  const { can } = useCapabilities();
  const qc = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);

  const { data, isLoading } = useQuery<{ results: AutomationRule[] }>({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations/'),
  });

  const { data: executions } = useQuery<any[]>({
    queryKey: ['automation-executions'],
    queryFn: () => api.get('/automations/executions/'),
    enabled: can('automations.manage'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automations/${id}/toggle/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); toast.success('Статус изменён'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); toast.success('Удалено'); },
  });

  if (!can('automations.manage')) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <EmptyState
          icon={<Zap size={22} />}
          title="Автоматизации недоступны"
          subtitle="Обновите режим CRM до Продвинутого или Промышленного"
        />
      </div>
    );
  }

  const rules: AutomationRule[] = (data?.results as AutomationRule[]) ?? [];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <PageHeader
        title="Автоматизации"
        subtitle={`${rules.length} правил · ${rules.filter((r) => r.status === 'active').length} активных`}
        actions={
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setBuilderOpen(true)}>
            Создать правило
          </Button>
        }
      />

      <div style={{
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 20,
      }}>
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <Skeleton height={14} width="40%" />
            </div>
          ))
        ) : rules.length === 0 ? (
          <EmptyState
            icon={<Zap size={20} />}
            title="Правил нет"
            subtitle="Создайте первое правило автоматизации"
            action={<Button size="sm" onClick={() => setBuilderOpen(true)}>Создать</Button>}
          />
        ) : (
          rules.map((rule, idx) => {
            const st = STATUS_CFG[rule.status] ?? STATUS_CFG.draft;
            const trigger = TRIGGERS.find((t) => t.value === rule.trigger_type);
            const TIcon = trigger?.icon ?? Zap;
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderBottom: idx < rules.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: rule.status === 'active' ? `${trigger?.color ?? '#10B981'}15` : 'var(--color-bg-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TIcon size={16} style={{ color: rule.status === 'active' ? (trigger?.color ?? '#10B981') : 'var(--color-text-muted)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{rule.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {trigger?.label ?? rule.trigger_type}
                    </span>
                    {rule.condition_groups.length > 0 && (
                      <>
                        <span style={{ color: 'var(--color-border)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {rule.condition_groups.reduce((s, g) => s + g.conditions.length, 0)} условий
                        </span>
                      </>
                    )}
                    {rule.actions.length > 0 && (
                      <>
                        <span style={{ color: 'var(--color-border)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {rule.actions.length} действий
                        </span>
                      </>
                    )}
                    {rule.executions_count > 0 && (
                      <>
                        <span style={{ color: 'var(--color-border)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--color-success)' }}>
                          {rule.executions_count} выполнений
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Badge bg={st.bg} color={st.color}>{st.label}</Badge>

                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    variant="ghost" size="xs"
                    icon={rule.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                    onClick={() => toggleMutation.mutate(rule.id)}
                  >
                    {rule.status === 'active' ? 'Пауза' : 'Старт'}
                  </Button>
                  <motion.button
                    whileHover={{ color: 'var(--color-danger)' }}
                    onClick={() => { if (confirm('Удалить правило?')) deleteMutation.mutate(rule.id); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)', padding: '4px', borderRadius: 4,
                    }}
                  >
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {executions && executions.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--color-text-secondary)' }}>
            Последние выполнения
          </div>
          <div style={{
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            {executions.slice(0, 10).map((ex: any, idx: number) => (
              <div
                key={ex.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  borderBottom: idx < 9 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: ex.status === 'completed' ? 'var(--color-success)'
                    : ex.status === 'failed' ? 'var(--color-danger)' : 'var(--color-warning)',
                }} />
                <span style={{ fontSize: 12, flex: 1, color: 'var(--color-text-primary)' }}>{ex.rule_name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {ex.entity_type} · {ex.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BuilderDrawer open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
}
