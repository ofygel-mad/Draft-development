import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, Search } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Badge } from '../../shared/ui/Badge';
import { useCapabilities } from '../../shared/hooks/useCapabilities';

interface AuditEntry {
  id: string; action: string; entity_type: string; entity_id: string;
  entity_label: string; actor_name: string; diff: Record<string, [any, any]> | null;
  ip_address: string | null; created_at: string;
}

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: '#D1FAE5', color: '#065F46', label: 'Создание' },
  update: { bg: '#FEF3C7', color: '#92400E', label: 'Изменение' },
  delete: { bg: '#FEE2E2', color: '#991B1B', label: 'Удаление' },
  login: { bg: '#EDE9FE', color: '#5B21B6', label: 'Вход' },
  export: { bg: '#DBEAFE', color: '#1E40AF', label: 'Экспорт' },
  import: { bg: '#F0FDF4', color: '#14532D', label: 'Импорт' },
};

const ENTITY_LABELS: Record<string, string> = {
  customer: 'Клиент', deal: 'Сделка', task: 'Задача',
  user: 'Пользователь', pipeline: 'Воронка', organization: 'Организация',
};

export default function AuditPage() {
  const { can } = useCapabilities();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const { data, isLoading } = useQuery<{ results: AuditEntry[]; count: number }>({
    queryKey: ['audit', search, filterAction],
    queryFn: () => api.get('/audit/', { search, action: filterAction || undefined }),
    enabled: can('audit.read'),
  });

  if (!can('audit.read')) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState icon={<Shield size={40} />} title="Журнал аудита" subtitle="Доступно только в промышленном режиме (Industrial). Обновите план для просмотра всех действий пользователей." />
      </div>
    );
  }

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: 24 }} className="crm-page">
      <PageHeader title="Журнал аудита" subtitle="История всех действий пользователей системы" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по объекту, пользователю..." className="crm-input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="crm-select" style={{ width: 160 }}>
          <option value="">Все действия</option>
          {Object.entries(ACTION_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 120px 140px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
          {['Действие', 'Объект', 'Пользователь', 'IP', 'Время'].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>)}
        </div>
        {isLoading ? [1, 2, 3, 4, 5].map(i => <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}><Skeleton height={14} width="80%" /></div>) : (data?.results ?? []).length === 0 ? (
          <div style={{ padding: 40 }}><EmptyState title="Записей нет" subtitle="Аудит-лог пуст или не соответствует фильтрам." /></div>
        ) : (data?.results ?? []).map((entry, i) => {
          const ac = ACTION_COLORS[entry.action] ?? { bg: '#F3F4F6', color: '#374151', label: entry.action };
          return (
            <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 120px 140px', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              <Badge bg={ac.bg} color={ac.color}>{ac.label}</Badge>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{entry.entity_label || entry.entity_id}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}</div></div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{entry.actor_name}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{entry.ip_address ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmt(entry.created_at)}</div>
            </motion.div>
          );
        })}
      </div>
      {data && <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12 }}>Показано {data.results.length} из {data.count} записей</div>}
    </div>
  );
}
