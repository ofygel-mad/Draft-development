import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Users, Briefcase, CheckSquare, Download } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Button } from '../../shared/ui/Button';

interface ReportData {
  customers_count: number; customers_delta: number;
  active_deals_count: number; revenue_month: number; revenue_delta: number;
  tasks_today: number; overdue_tasks: number;
  deals_by_stage: Array<{ stage: string; count: number; amount: number }>;
  customers_by_source: Array<{ source: string; count: number }>;
  revenue_by_month?: Array<{ month: string; revenue: number; deals: number }>;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 35 } } };

const PIE_COLORS = ['#D97706', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#6B7280'];

function MetricCard({ label, value, delta, icon, color, fmt = 'number' }: {
  label: string; value: number; delta?: number; icon: React.ReactNode; color: string; fmt?: 'number' | 'currency';
}) {
  const display = fmt === 'currency'
    ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
    : value.toLocaleString('ru-RU');

  return (
    <motion.div variants={item} style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? '#10B981' : '#EF4444', background: delta >= 0 ? '#D1FAE5' : '#FEE2E2', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginBottom: 4 }}>{display}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }}/>
          <span>{p.name}: {typeof p.value === 'number' && p.value > 10000
            ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(p.value)
            : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary/'),
  });

  const handleExport = async () => {
    try {
      const resp = await fetch('/api/v1/reports/export/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('crm-auth') ? JSON.parse(localStorage.getItem('crm-auth')!).state?.token : ''}` },
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'crm-report.csv'; a.click();
    } catch (e) { /* silent */ }
  };

  const sourceData = (data?.customers_by_source ?? []).map(s => ({
    name: s.source || 'Не указан', value: s.count,
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Отчёты"
        subtitle="Аналитика по клиентам и сделкам"
        actions={
          <Button variant="amber-outline" size="sm" onClick={handleExport}>
            <Download size={14} style={{ marginRight: 6 }}/> Экспорт CSV
          </Button>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {isLoading ? [1,2,3,4].map(i => (
          <div key={i} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20, height: 120 }}>
            <Skeleton height={16} width="40%" style={{ marginBottom: 12 }}/>
            <Skeleton height={32} width="70%"/>
          </div>
        )) : <>
          <MetricCard label="Всего клиентов" value={data?.customers_count ?? 0} delta={data?.customers_delta} icon={<Users size={18}/>} color="#3B82F6"/>
          <MetricCard label="Активные сделки" value={data?.active_deals_count ?? 0} icon={<Briefcase size={18}/>} color="#D97706"/>
          <MetricCard label="Выручка за месяц" value={data?.revenue_month ?? 0} fmt="currency" icon={<TrendingUp size={18}/>} color="#10B981"/>
          <MetricCard label="Задач сегодня" value={data?.tasks_today ?? 0} delta={-(data?.overdue_tasks ?? 0)} icon={<CheckSquare size={18}/>} color="#8B5CF6"/>
        </>}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Сделки по стадиям</div>
          {isLoading ? <Skeleton height={200}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.deals_by_stage ?? []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="count" name="Сделок" fill="#D97706" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Клиенты по источникам</div>
          {isLoading ? <Skeleton height={200}/> : sourceData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="45%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>) }
                </Pie>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {data?.revenue_by_month && data.revenue_by_month.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Выручка по месяцам</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.revenue_by_month}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(v)}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="revenue" name="Выручка" stroke="#D97706" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#D97706' }}/>
              <Line type="monotone" dataKey="deals" name="Сделок" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
