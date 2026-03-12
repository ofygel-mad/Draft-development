import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, CheckSquare, TrendingUp,
  Plus, ArrowRight, AlertTriangle, Clock, Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { formatNumber, formatMoney } from '../../shared/utils/format';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Badge } from '../../shared/ui/Badge';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { DailyFocus } from '../../widgets/daily-focus/DailyFocus';
import { TeamPresence } from '../../widgets/team-presence/TeamPresence';

interface DashboardData {
  customers_count:    number;
  customers_delta:    number;
  active_deals_count: number;
  revenue_month:      number;
  tasks_today:        number;
  overdue_tasks:      number;
  recent_customers: Array<{
    id: string; full_name: string;
    company_name: string; status: string; created_at: string;
  }>;
  deals_no_activity: number;
  stalled_deals: Array<{
    id: string; title: string; amount: number; currency: string;
    stage: string; customer_name: string; customer_id: string;
    days_silent: number | null;
  }>;
  silent_customers: Array<{
    id: string; full_name: string; company_name: string;
    phone: string; days_silent: number | null;
  }>;
  today_tasks: Array<{
    id: string; title: string; priority: string;
    due_at: string | null; customer: { id: string; full_name: string } | null;
  }>;
}

const SC: Record<string, { bg: string; color: string }> = {
  new:      { bg: '#DBEAFE', color: '#1D4ED8' },
  active:   { bg: '#D1FAE5', color: '#065F46' },
  inactive: { bg: '#F3F4F6', color: '#6B7280' },
  archived: { bg: '#F3F4F6', color: '#9CA3AF' },
};
const SL: Record<string, string> = {
  new: 'Новый', active: 'Активный', inactive: 'Неактивный', archived: 'Архив',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const fadeUp  = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 38 } },
};

function StatCard({ label, value, delta, icon, accent, fmt = 'n', loading }: {
  label: string; value: number; delta?: number; icon: React.ReactNode;
  accent: string; fmt?: 'n' | 'c'; loading?: boolean;
}) {
  const orgCurrency = useAuthStore.getState().org?.currency ?? 'KZT';
  const display =
    fmt === 'c'
      ? formatMoney(value, orgCurrency)
      : formatNumber(value);

  return (
    <motion.div variants={fadeUp} style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: `${accent}15`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: accent }}>
          {icon}
        </div>
        {delta !== undefined && delta !== 0 && (
          <span style={{ fontSize: 11, fontWeight: 600,
            color: delta > 0 ? '#10B981' : '#EF4444',
            background: delta > 0 ? '#D1FAE5' : '#FEE2E2',
            padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {loading
        ? <Skeleton height={24} width={72} style={{ marginBottom: 6 }} />
        : <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)',
            letterSpacing: '-0.015em', marginBottom: 4 }}>{display}</div>
      }
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
    </motion.div>
  );
}


function WatchlistBlock({ data, navigate, isMobile }: {
  data: DashboardData;
  navigate: ReturnType<typeof import('react-router-dom').useNavigate>;
  isMobile: boolean;
}) {
  const stalled = data.stalled_deals ?? [];
  const silent = data.silent_customers ?? [];
  const todayTasks = data.today_tasks ?? [];
  if (stalled.length === 0 && silent.length === 0 && todayTasks.length === 0) return null;

  return (
    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {stalled.length > 0 && (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Сделки без движения</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{stalled.length}</span>
          </div>
          {stalled.map((d) => (
            <div key={d.id} onClick={() => navigate(`/deals/${d.id}`)} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-muted)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{d.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.customer_name} · {d.stage}</span>
                {d.days_silent != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: d.days_silent >= 10 ? '#EF4444' : '#D97706', background: d.days_silent >= 10 ? '#FEE2E2' : '#FEF3C7', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                    {d.days_silent}д без касания
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {silent.length > 0 && (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>🔕</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Молчат клиенты</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{silent.length}</span>
          </div>
          {silent.map((c) => (
            <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-muted)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{c.full_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.company_name || c.phone}</span>
                {c.days_silent != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                    {c.days_silent}д тишины
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {todayTasks.length > 0 && (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>📋</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>На сегодня</span>
            </div>
            <button onClick={() => navigate('/tasks')} style={{ fontSize: 11, color: 'var(--color-amber)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Все →
            </button>
          </div>
          {todayTasks.map((t) => {
            const pc: Record<string, string> = { high: '#EF4444', medium: '#D97706', low: '#9CA3AF' };
            return (
              <div key={t.id} onClick={() => navigate('/tasks')} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: pc[t.priority] ?? '#9CA3AF' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  {t.customer && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.customer.full_name}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const isMobile  = useIsMobile();
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn:  () => api.get('/reports/dashboard'),
  });

  const pad = isMobile ? '14px 16px' : '24px 28px';

  return (
    <div style={{ padding: pad, maxWidth: 1120 }}>
      <DailyFocus />

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700,
            fontFamily: 'var(--font-display)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>
            {user?.full_name?.split(' ')[0] ?? 'пользователь'} 👋
          </h1>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Plus size={13} />}
              onClick={() => window.dispatchEvent(new CustomEvent('crm:new-customer'))}>
              Клиент
            </Button>
            <Button size="sm" icon={<Plus size={13} />}
              onClick={() => window.dispatchEvent(new CustomEvent('crm:new-deal'))}>
              Сделка
            </Button>
          </div>
        )}
      </div>

      {/* ── Attention banner ───────────────────────────────── */}
      {(data?.overdue_tasks ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', marginBottom: 16,
            background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)',
            border: '1px solid #FDE68A' }}>
          <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500, flex: 1 }}>
            {data!.overdue_tasks} просроченных задач — требуют внимания
          </span>
          <button onClick={() => navigate('/tasks')}
            style={{ fontSize: 12, color: '#D97706', fontWeight: 600, background: 'none',
              border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Открыть →
          </button>
        </motion.div>
      )}

      {/* ── Stats 2×2 mobile / 4×1 desktop ────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 10 : 12,
        marginBottom: 20,
      }}>
        <StatCard label="Клиентов"      value={data?.customers_count    ?? 0} delta={data?.customers_delta}
          icon={<Users size={15} />}       accent="#3B82F6" loading={isLoading} />
        <StatCard label="Активных сделок" value={data?.active_deals_count ?? 0}
          icon={<Briefcase size={15} />}   accent="#D97706" loading={isLoading} />
        <StatCard label="Задач сегодня" value={data?.tasks_today        ?? 0}
          icon={<CheckSquare size={15} />} accent="#10B981" loading={isLoading} />
        <StatCard label="Выручка / мес" value={data?.revenue_month      ?? 0} fmt="c"
          icon={<TrendingUp size={15} />}  accent="#8B5CF6" loading={isLoading} />
      </motion.div>

      {/* ── Bottom grid ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
        gap: isMobile ? 12 : 16,
      }}>

        {/* Recent customers */}
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 18px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Последние клиенты</span>
            <button onClick={() => navigate('/customers')}
              style={{ fontSize: 12, color: 'var(--color-amber)', fontWeight: 500, background: 'none',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Все <ArrowRight size={11} />
            </button>
          </div>
          {isLoading
            ? [1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-border)' }}>
                  <Skeleton height={13} width="50%" style={{ marginBottom: 5 }} />
                  <Skeleton height={11} width="30%" />
                </div>
              ))
            : (data?.recent_customers ?? []).length === 0
              ? <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 13,
                  color: 'var(--color-text-muted)' }}>
                  Клиентов пока нет
                </div>
              : (data?.recent_customers ?? []).map((c, idx) => {
                  const sc = SC[c.status] ?? SC.new;
                  return (
                    <motion.div key={c.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      whileHover={{ backgroundColor: 'var(--color-bg-muted)' }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                        {c.company_name && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.company_name}
                          </div>
                        )}
                      </div>
                      <Badge bg={sc.bg} color={sc.color}>{SL[c.status] ?? c.status}</Badge>
                    </motion.div>
                  );
                })
          }
        </div>

        {/* Quick actions */}
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Быстрые действия</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr',
            gap: 8,
          }}>
            {[
              { label: 'Добавить клиента', icon: <Users size={14} />,
                action: () => window.dispatchEvent(new CustomEvent('crm:new-customer')) },
              { label: 'Создать сделку',  icon: <Briefcase size={14} />,
                action: () => window.dispatchEvent(new CustomEvent('crm:new-deal')) },
              { label: 'Новая задача',    icon: <CheckSquare size={14} />,
                action: () => window.dispatchEvent(new CustomEvent('crm:new-task')) },
              { label: 'Импорт данных',   icon: <TrendingUp size={14} />,
                action: () => navigate('/imports') },
            ].map(a => (
              <motion.button key={a.label}
                whileHover={{ x: isMobile ? 0 : 2, backgroundColor: 'var(--color-bg-hover)' }}
                whileTap={{ scale: 0.97 }}
                onClick={a.action}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                  background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
                <span style={{ color: 'var(--color-amber)', flexShrink: 0 }}>{a.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: isMobile ? 12 : 13 }}>{a.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Today summary */}
          {!isLoading && (data?.tasks_today ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              onClick={() => navigate('/tasks')}
              style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, border: '1px solid var(--color-border)' }}>
              <Clock size={14} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Задач на сегодня: <strong style={{ color: 'var(--color-text-primary)' }}>{data!.tasks_today}</strong>
              </span>
              <ArrowRight size={11} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </motion.div>
          )}
        </div>
      </div>

      {!isLoading && data && (
        <WatchlistBlock data={data} navigate={navigate} isMobile={isMobile} />
      )}
    </div>
  );
}
