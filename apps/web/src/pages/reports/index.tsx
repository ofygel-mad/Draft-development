import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Users, Briefcase, CheckSquare, Download, Trophy, Target } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Button } from '../../shared/ui/Button';
import { useAuthStore } from '../../shared/stores/auth';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface ReportData {
  customers_count: number; customers_delta: number;
  active_deals_count: number; revenue_month: number;
  tasks_today: number; overdue_tasks: number;
  deals_by_stage:       Array<{ stage: string; count: number; amount: number }>;
  customers_by_source:  Array<{ source: string; count: number }>;
  revenue_by_month:     Array<{ month: string; revenue: number; deals: number }>;
  manager_leaderboard:  Array<{ name: string; deals: number; revenue: number }>;
  funnel: { customers: number; with_deals: number; deals: number; won: number; conversion_rate: number };
}

const COLORS = ['#D97706', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#6B7280'];
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item    = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 35 } } };

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span>{p.name}: {typeof p.value === 'number' && p.value > 1000
            ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function Card({ title, children, delay = 0, action }: { title: string; children: React.ReactNode; delay?: number; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function Metric({ label, value, delta, icon, color, fmt = 'number' }: {
  label: string; value: number; delta?: number; icon: React.ReactNode; color: string; fmt?: 'number' | 'currency';
}) {
  const display = fmt === 'currency'
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
    : value.toLocaleString('ru-RU');
  return (
    <motion.div variants={item} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? '#10B981' : '#EF4444',
            background: delta >= 0 ? '#D1FAE5' : '#FEE2E2', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginBottom: 4 }}>{display}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
    </motion.div>
  );
}

export default function ReportsPage() {
  const token = useAuthStore(s => s.token);
  const isMobile = useIsMobile();
  const { data, isLoading } = useQuery<ReportData>({ queryKey: ['reports-summary'], queryFn: () => api.get('/reports/summary/') });

  const dl = async (path: string, name: string) => {
    const r = await fetch(`/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  const src = (data?.customers_by_source ?? []).map(s => ({ name: s.source || 'Не указан', value: s.count }));
  const funnel = data?.funnel ? [
    { name: 'Клиенты',     value: data.funnel.customers,  fill: '#D97706' },
    { name: 'Со сделками', value: data.funnel.with_deals, fill: '#F59E0B' },
    { name: 'Сделки',      value: data.funnel.deals,      fill: '#3B82F6' },
    { name: 'Выиграно',    value: data.funnel.won,        fill: '#10B981' },
  ] : [];

  return (
    <div style={{ padding: isMobile ? '14px 16px' : '24px 28px' }}>
      <PageHeader title="Отчёты" subtitle="Аналитика по клиентам и сделкам"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Download size={13} />}
              onClick={() => dl('/reports/export/customers/', 'customers.xlsx')}>Клиенты.xlsx</Button>
            <Button variant="secondary" size="sm" icon={<Download size={13} />}
              onClick={() => dl('/reports/export/deals/', 'deals.xlsx')}>Сделки.xlsx</Button>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill, minmax(210px,1fr))', gap: 16, marginBottom: 28 }}>
        {isLoading ? [1,2,3,4].map(i => <div key={i} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20, height: 120 }}><Skeleton height={16} width="40%" style={{ marginBottom: 12 }}/><Skeleton height={32} width="70%"/></div>)
          : <>
            <Metric label="Всего клиентов"   value={data?.customers_count ?? 0}    delta={data?.customers_delta}   icon={<Users size={18}/>}       color="#3B82F6" />
            <Metric label="Активные сделки"  value={data?.active_deals_count ?? 0}                                 icon={<Briefcase size={18}/>}   color="#D97706" />
            <Metric label="Выручка за месяц" value={data?.revenue_month ?? 0}      fmt="currency"                  icon={<TrendingUp size={18}/>}   color="#10B981" />
            <Metric label="Задач сегодня"    value={data?.tasks_today ?? 0}                                        icon={<CheckSquare size={18}/>}  color="#8B5CF6" />
          </>
        }
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 20, marginBottom: isMobile ? 12 : 20 }}>
        <Card title="Сделки по стадиям" delay={0.2}>
          {isLoading ? <Skeleton height={220}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.deals_by_stage ?? []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="Сделок" fill="#D97706" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Клиенты по источникам" delay={0.3}>
          {isLoading ? <Skeleton height={220}/> : src.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={src} cx="45%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {src.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip content={<Tip/>}/><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {(data?.revenue_by_month?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Card title="Выручка по месяцам" delay={0.4}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data!.revenue_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => new Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(v)}/>
                <Tooltip content={<Tip/>}/>
                <Line type="monotone" dataKey="revenue" name="Выручка" stroke="#D97706" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}/>
                <Line type="monotone" dataKey="deals"   name="Сделок"  stroke="#3B82F6" strokeWidth={2}   dot={false} strokeDasharray="4 2"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 20 }}>
        {(data?.manager_leaderboard?.length ?? 0) > 0 && (
          <Card title="Лидерборд менеджеров" delay={0.5}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data!.manager_leaderboard.map((m, i) => (
                <motion.div key={m.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : 'var(--color-bg-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: i < 3 ? 'white' : 'var(--color-text-muted)' }}>
                    {i < 3 ? <Trophy size={11}/> : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.deals} сделок</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-amber)', fontFamily: 'var(--font-display)' }}>
                    {new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(m.revenue)} ₽
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {data?.funnel && data.funnel.customers > 0 && (
          <Card title="Воронка конверсии" delay={0.6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map((s, i) => {
                const pct = funnel[0].value > 0 ? Math.round((s.value / funnel[0].value) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.fill }}>{s.value} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                        style={{ height: '100%', background: s.fill, borderRadius: 'var(--radius-full)' }}/>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 4, padding: '10px 14px', background: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={14} style={{ color: 'var(--color-success)' }}/>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Конверсия: <strong style={{ color: 'var(--color-success)' }}>{data.funnel.conversion_rate}%</strong>
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
