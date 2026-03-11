import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Briefcase, CheckSquare, TrendingUp, Plus, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Badge } from '../../shared/ui/Badge';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface DashboardData {
  customers_count: number;
  customers_delta: number;
  active_deals_count: number;
  revenue_month: number;
  tasks_today: number;
  overdue_tasks: number;
  recent_customers: Array<{ id: string; full_name: string; company_name: string; status: string; created_at: string }>;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: '#DBEAFE', color: '#1D4ED8' },
  active: { bg: '#D1FAE5', color: '#065F46' },
  inactive: { bg: '#F3F4F6', color: '#6B7280' },
  archived: { bg: '#F3F4F6', color: '#9CA3AF' },
};
const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', active: 'Активный', inactive: 'Неактивный', archived: 'Архив',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 35 } } };

function StatCard({ label, value, delta, icon, colorAccent, format = 'number', loading }: {
  label: string; value: number; delta?: number; icon: React.ReactNode;
  colorAccent: string; format?: 'number' | 'currency'; loading?: boolean;
}) {
  const fmt = (n: number) =>
    format === 'currency'
      ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
      : n.toLocaleString('ru-RU');

  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 34, height: 34, background: `${colorAccent}15`,
          borderRadius: 'var(--radius-md)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: colorAccent, flexShrink: 0,
        }}>
          {icon}
        </div>
        {delta !== undefined && delta !== 0 && (
          <span style={{
            fontSize: 11, color: delta > 0 ? '#10B981' : '#EF4444', fontWeight: 600,
            background: delta > 0 ? '#D1FAE5' : '#FEE2E2', padding: '2px 7px', borderRadius: 'var(--radius-full)',
          }}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {loading
        ? <Skeleton height={26} width={80} />
        : <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{fmt(value)}</div>
      }
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isMobile = useIsMobile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/reports/dashboard'),
  });

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1100 }}>
      <div style={{
        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '4px 0 0' }}>
            {user?.full_name?.split(' ')[0] ?? 'пользователь'} 👋
          </h1>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/customers')}>Клиент</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/deals')}>Сделка</Button>
          </div>
        )}
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 10 : 12,
        marginBottom: 20,
      }}>
        {[
          { label: 'Клиентов всего', value: data?.customers_count ?? 0, delta: data?.customers_delta, icon: <Users size={16} />, colorAccent: '#3B82F6' },
          { label: 'Активных сделок', value: data?.active_deals_count ?? 0, icon: <Briefcase size={16} />, colorAccent: '#D97706' },
          { label: 'Задач сегодня', value: data?.tasks_today ?? 0, icon: <CheckSquare size={16} />, colorAccent: '#10B981' },
          { label: 'Выручка месяца', value: data?.revenue_month ?? 0, format: 'currency' as const, icon: <TrendingUp size={16} />, colorAccent: '#8B5CF6' },
        ].map(stat => (
          <motion.div key={stat.label} variants={item}>
            <StatCard {...stat} loading={isLoading} />
          </motion.div>
        ))}
      </motion.div>

      {(data?.overdue_tasks ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', marginBottom: 16,
            background: '#FEF3C7', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A',
          }}>
          <AlertTriangle size={15} color="#D97706" />
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
            {data!.overdue_tasks} просроченных задач
          </span>
          <button onClick={() => navigate('/tasks')}
            style={{
              marginLeft: 'auto', fontSize: 12, color: '#D97706', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
            Посмотреть →
          </button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Последние клиенты</span>
            <button onClick={() => navigate('/customers')}
              style={{
                fontSize: 12, color: 'var(--color-amber)', fontWeight: 500, background: 'none',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              Все <ArrowRight size={12} />
            </button>
          </div>
          <div>
            {isLoading
              ? [1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-border)' }}>
                  <Skeleton height={13} width="55%" />
                </div>
              ))
              : (data?.recent_customers ?? []).length === 0
                ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Нет клиентов
                </div>
                : (data?.recent_customers ?? []).map((c, idx) => {
                  const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.new;
                  return (
                    <motion.div key={c.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      whileHover={{ backgroundColor: 'var(--color-bg-muted)' }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                      }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.full_name}</div>
                        {c.company_name && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.company_name}</div>}
                      </div>
                      <Badge bg={sc.bg} color={sc.color}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
                    </motion.div>
                  );
                })
            }
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 18px',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, marginTop: 0 }}>Быстрые действия</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: 8 }}>
            {[
              { label: 'Добавить клиента', path: '/customers', icon: <Users size={14} /> },
              { label: 'Создать сделку', path: '/deals', icon: <Briefcase size={14} /> },
              { label: 'Новая задача', path: '/tasks', icon: <CheckSquare size={14} /> },
              { label: 'Импорт клиентов', path: '/imports', icon: <TrendingUp size={14} /> },
            ].map(action => (
              <motion.button key={action.path} whileHover={{ x: isMobile ? 0 : 3 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textAlign: 'left',
                  transition: 'border-color var(--transition-fast)',
                }}>
                <span style={{ color: 'var(--color-amber)', flexShrink: 0 }}>{action.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
