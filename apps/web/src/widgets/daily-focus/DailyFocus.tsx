import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function DailyFocus() {
  const { data, isLoading } = useQuery({ queryKey: ['daily-focus'], queryFn: () => api.get<any>('/reports/daily-focus') });
  if (isLoading || !data?.start_day) return null;
  return <section style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 16, border: '1px solid var(--color-border)' }}><div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Start day</div><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Что требует внимания сейчас</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}><div><div>{data.start_day.overdue_tasks}</div><small>Просрочено</small></div><div><div>{data.start_day.tasks_due_today}</div><small>На сегодня</small></div><div><div>{data.start_day.deals_without_touch}</div><small>Сделки без касания</small></div></div></section>;
}
