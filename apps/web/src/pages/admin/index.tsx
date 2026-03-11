import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, TrendingUp, Send,
  UserCheck, UserX, BarChart2, Settings2,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useAuthStore } from '../../shared/stores/auth';
import { useRole } from '../../shared/hooks/useRole';
import { toast } from 'sonner';

interface TeamMember { id: string; full_name: string; email: string; status: string; role?: string; }
interface AuditEntry { id: string; action: string; entity_type: string; entity_label: string; actor?: { full_name: string }; created_at: string; ip_address?: string; }
interface DashboardStats { total_customers: number; active_deals: number; total_users: number; deals_won_month: number; }

const ROLE_COLORS: Record<string, string> = {
  owner: '#8B5CF6', admin: '#D97706', manager: '#3B82F6', viewer: '#6B7280',
};
const ACTION_LABELS: Record<string, string> = {
  create: 'Создание', update: 'Изменение', delete: 'Удаление',
  login: 'Вход', logout: 'Выход', export: 'Экспорт', import: 'Импорт',
};
const ACTION_COLORS: Record<string, string> = {
  create: '#10B981', update: '#3B82F6', delete: '#EF4444',
  login: '#6B7280', logout: '#6B7280', export: '#D97706', import: '#D97706',
};
const MODE_LABELS: Record<string, string> = {
  basic: 'Базовый', advanced: 'Продвинутый', industrial: 'Промышленный',
};
const MODE_COLORS: Record<string, string> = {
  basic: '#3B82F6', advanced: '#D97706', industrial: '#8B5CF6',
};

type Tab = 'overview' | 'team' | 'audit' | 'settings';

export default function AdminPage() {
  const qc = useQueryClient();
  const { isOwner } = useRole();
  const org = useAuthStore((s) => s.org);
  const [tab, setTab] = useState<Tab>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('manager');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/reports/dashboard/'),
    enabled: tab === 'overview',
  });

  const { data: team, isLoading: teamLoading } = useQuery<{ results: TeamMember[]; count: number }>({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team/'),
    enabled: tab === 'team',
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{ results: AuditEntry[] }>({
    queryKey: ['audit'],
    queryFn: () => api.get('/audit/logs/?page_size=50'),
    enabled: tab === 'audit',
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Роль обновлена'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/deactivate/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Пользователь деактивирован'); },
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/activate/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Пользователь активирован'); },
  });

  const upgradeMutation = useMutation({
    mutationFn: (mode: string) => api.patch('/organization/', { mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization'] }); toast.success('Режим CRM обновлён'); window.location.reload(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res: any = await api.post('/auth/invite', { email: inviteEmail, role: inviteRole });
      toast.success(res.detail ?? 'Приглашение отправлено');
      setInviteEmail('');
      setShowInviteForm(false);
      qc.invalidateQueries({ queryKey: ['team'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка при отправке');
    } finally {
      setInviting(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Обзор', icon: <BarChart2 size={15} /> },
    { key: 'team', label: 'Команда', icon: <Users size={15} /> },
    { key: 'audit', label: 'Аудит', icon: <Activity size={15} /> },
    { key: 'settings', label: 'Настройки плана', icon: <Settings2 size={15} /> },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Панель управления"
        subtitle={`Организация: ${org?.name ?? '—'} · Режим: ${MODE_LABELS[org?.mode ?? 'basic']}`}
      />

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 24, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
              background: tab === t.key ? 'var(--color-bg-elevated)' : 'transparent',
              color: tab === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Клиентов всего', value: statsLoading ? null : stats?.total_customers, icon: <Users size={20} />, color: '#3B82F6' },
                { label: 'Активных сделок', value: statsLoading ? null : stats?.active_deals, icon: <TrendingUp size={20} />, color: '#10B981' },
                { label: 'Сотрудников', value: statsLoading ? null : stats?.total_users, icon: <UserCheck size={20} />, color: '#D97706' },
                { label: 'Выигранных сделок (месяц)', value: statsLoading ? null : stats?.deals_won_month, icon: <CheckCircle2 size={20} />, color: '#8B5CF6' },
              ].map((card) => (
                <div key={card.label} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, marginBottom: 12 }}>
                    {card.icon}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                    {card.value === null ? <Skeleton height={28} width={60} /> : (card.value ?? '—')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{card.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Текущий режим CRM</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: MODE_COLORS[org?.mode ?? 'basic'] }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: MODE_COLORS[org?.mode ?? 'basic'] }}>
                  {MODE_LABELS[org?.mode ?? 'basic']}
                </span>
                {isOwner && org?.mode !== 'industrial' && (
                  <button onClick={() => setTab('settings')}
                    style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-amber)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    Повысить план →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'team' && (
          <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {team?.count ?? 0} сотрудников
              </span>
              <Button size="sm" icon={<Send size={13} />} onClick={() => setShowInviteForm(!showInviteForm)}>
                Пригласить сотрудника
              </Button>
            </div>

            <AnimatePresence>
              {showInviteForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'var(--color-amber-subtle)', border: '1px solid var(--color-amber-light)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@company.kz" type="email"
                      style={{ flex: 1, height: 36, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'white' }} />
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                      style={{ height: 36, padding: '0 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, fontFamily: 'var(--font-body)', background: 'white', outline: 'none' }}>
                      <option value="admin">Администратор</option>
                      <option value="manager">Менеджер</option>
                      <option value="viewer">Наблюдатель</option>
                    </select>
                    <Button size="sm" loading={inviting} onClick={handleInvite}>Отправить</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {teamLoading
                ? [1, 2, 3].map((i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <Skeleton height={14} width="60%" />
                  </div>
                ))
                : (team?.results ?? []).map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: ROLE_COLORS[member.role ?? 'viewer'] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ROLE_COLORS[member.role ?? 'viewer'] }}>
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{member.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{member.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: member.status === 'active' ? '#10B981' : '#9CA3AF' }}>
                        {member.status === 'active' ? '● Активен' : '○ Неактивен'}
                      </span>
                      {member.role === 'owner' ? (
                        <Badge bg="#8B5CF620" color="#8B5CF6">Владелец</Badge>
                      ) : (
                        <select value={member.role ?? 'viewer'}
                          onChange={(e) => setRoleMutation.mutate({ userId: member.id, role: e.target.value })}
                          style={{ height: 30, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-body)', background: 'var(--color-bg-elevated)', outline: 'none', cursor: 'pointer' }}>
                          <option value="admin">Администратор</option>
                          <option value="manager">Менеджер</option>
                          <option value="viewer">Наблюдатель</option>
                        </select>
                      )}
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => member.status === 'active'
                            ? deactivateMutation.mutate(member.id)
                            : activateMutation.mutate(member.id)}
                          title={member.status === 'active' ? 'Деактивировать' : 'Активировать'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', color: member.status === 'active' ? '#EF4444' : '#10B981', display: 'flex' }}>
                          {member.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </motion.div>
        )}

        {tab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '140px 140px 1fr 160px 120px', gap: 8 }}>
                {['Действие', 'Объект', 'Описание', 'Сотрудник', 'Время'].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                ))}
              </div>
              {auditLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <Skeleton height={13} width="80%" />
                  </div>
                ))
                : (auditData?.results ?? []).map((entry) => (
                  <div key={entry.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '140px 140px 1fr 160px 120px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ACTION_COLORS[entry.action] ?? '#6B7280' }}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{entry.entity_type}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.entity_label || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {entry.actor?.full_name ?? 'Система'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(entry.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              }
              {!auditLoading && !auditData?.results?.length && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  <Activity size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <p>Действий пока нет</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!isOwner && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> Только владелец организации может менять режим CRM
              </div>
            )}
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              Текущий режим: <strong>{MODE_LABELS[org?.mode ?? 'basic']}</strong>. Повышение режима мгновенно открывает новые возможности.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { mode: 'basic', color: '#3B82F6', title: 'Базовый', features: ['Клиенты и сделки', 'Задачи', 'Простые отчёты'] },
                { mode: 'advanced', color: '#D97706', title: 'Продвинутый', features: ['+ Роли сотрудников', '+ Автоматизации', '+ Кастомные поля', '+ Расширенная аналитика'] },
                { mode: 'industrial', color: '#8B5CF6', title: 'Промышленный', features: ['+ Аудит всех действий', '+ API доступ', '+ Мультифилиальность', '+ SLA и очереди'] },
              ].map((m) => {
                const isCurrent = org?.mode === m.mode;
                return (
                  <div key={m.mode} style={{ background: 'var(--color-bg-elevated)', border: `2px solid ${isCurrent ? m.color : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', padding: '20px 18px', boxShadow: isCurrent ? `0 0 0 3px ${m.color}22` : 'none' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.title}</div>
                    {m.features.map((f) => (
                      <div key={f} style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={11} color={m.color} /> {f}
                      </div>
                    ))}
                    {isCurrent
                      ? <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: m.color, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> Текущий режим</div>
                      : (
                        <Button size="sm" style={{ marginTop: 14, width: '100%' }}
                          disabled={!isOwner || upgradeMutation.isPending}
                          onClick={() => upgradeMutation.mutate(m.mode)}>
                          Переключить
                        </Button>
                      )
                    }
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
