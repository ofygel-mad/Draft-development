import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Phone, Mail, Building2, User, Edit3,
  Plus, MessageSquare, CheckSquare, Briefcase, Clock,
  Tag, Calendar,
} from 'lucide-react';
import { api } from '../../../shared/api/client';
import { Button } from '../../../shared/ui/Button';
import { Badge } from '../../../shared/ui/Badge';
import { PageLoader } from '../../../shared/ui/PageLoader';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Drawer } from '../../../shared/ui/Drawer';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { CustomFieldsTab } from '../../../shared/ui/CustomFieldsTab';
import { ru } from 'date-fns/locale';

interface CustomerDetail {
  id: string; full_name: string; company_name: string;
  phone: string; email: string; source: string; status: string;
  owner: { id: string; full_name: string } | null;
  tags: string[]; notes: string;
  created_at: string; updated_at: string;
}
interface Activity {
  id: string; type: string; payload: Record<string, unknown>;
  actor: { full_name: string } | null; created_at: string;
}
interface Deal {
  id: string; title: string; amount: number | null; currency: string;
  status: string; stage: { name: string; type: string };
  created_at: string;
}
interface Task {
  id: string; title: string; priority: string; status: string;
  due_at: string | null; assigned_to: { full_name: string } | null;
}

const TABS = [
  { key: 'overview', label: 'Обзор' },
  { key: 'activity', label: 'Активность' },
  { key: 'deals', label: 'Сделки' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'fields', label: 'Доп. поля' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: '#DBEAFE', color: '#1D4ED8' },
  active: { bg: '#D1FAE5', color: '#065F46' },
  inactive: { bg: '#F3F4F6', color: '#6B7280' },
  archived: { bg: '#F3F4F6', color: '#9CA3AF' },
};
const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', active: 'Активный', inactive: 'Неактивный', archived: 'Архив',
};

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  note: <MessageSquare size={14} />,
  call: <Phone size={14} />,
  task_created: <CheckSquare size={14} />,
  deal_created: <Briefcase size={14} />,
  status_change: <Tag size={14} />,
  default: <Clock size={14} />,
};

function ContactItem({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  if (!value) return null;
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: 32, height: 32, borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-text-secondary)', flexShrink: 0,
      }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: 'none' }}>{content}</a> : content;
}

function NoteForm({ customerId, onSuccess }: { customerId: string; onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ body: string }>();
  const mutation = useMutation({
    mutationFn: (data: { body: string }) => api.post(`/customers/${customerId}/notes/`, data),
    onSuccess: () => { onSuccess(); reset(); toast.success('Заметка добавлена'); },
  });
  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        {...register('body', { required: true })}
        className="crm-textarea"
        placeholder="Написать заметку о клиенте..."
        style={{ minHeight: 72 }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" loading={isSubmitting} type="submit">Добавить заметку</Button>
      </div>
    </form>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [editDrawer, setEditDrawer] = useState(false);

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}/`),
  });
  const { data: activities } = useQuery<{ results: Activity[] }>({
    queryKey: ['customer-activities', id],
    queryFn: () => api.get(`/customers/${id}/activities/`),
    enabled: activeTab === 'activity' || activeTab === 'overview',
  });
  const { data: deals } = useQuery<{ results: Deal[] }>({
    queryKey: ['customer-deals', id],
    queryFn: () => api.get(`/customers/${id}/deals/`),
    enabled: activeTab === 'deals' || activeTab === 'overview',
  });
  const { data: tasks } = useQuery<{ results: Task[] }>({
    queryKey: ['customer-tasks', id],
    queryFn: () => api.get(`/customers/${id}/tasks/`),
    enabled: activeTab === 'tasks',
  });

  const { register, handleSubmit, reset: resetEdit, formState: { isSubmitting: editSubmitting } } = useForm<Partial<CustomerDetail>>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerDetail>) => api.patch(`/customers/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Клиент обновлён');
      setEditDrawer(false);
    },
  });

  if (isLoading) return <PageLoader />;
  if (!customer) return <EmptyState icon={<User size={22} />} title="Клиент не найден" />;

  const sc = STATUS_COLORS[customer.status] ?? STATUS_COLORS.new;
  const activeDeals = deals?.results.filter(d => d.status === 'open') ?? [];

  return (
    <div style={{ maxWidth: 1000, animation: 'slideUp 0.25s ease' }}>
      <button onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
        <ChevronLeft size={16} /> Назад к клиентам
      </button>

      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--color-amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--color-amber)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>{customer.full_name}</h1>
              {customer.company_name && (
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building2 size={13} />
                  {customer.company_name}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Badge bg={sc.bg} color={sc.color}>{STATUS_LABELS[customer.status]}</Badge>
                {customer.source && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-muted)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{customer.source}</span>}
                {activeDeals.length > 0 && <span style={{ fontSize: 11, color: '#065F46', background: '#D1FAE5', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{activeDeals.length} активных сделок</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button variant="secondary" size="sm" icon={<Edit3 size={13} />} onClick={() => { resetEdit(customer); setEditDrawer(true); }}>
              Редактировать
            </Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => navigate('/deals')}>
              Сделка
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
          {customer.phone && <ContactItem icon={<Phone size={14} />} label="Телефон" value={customer.phone} href={`tel:${customer.phone}`} />}
          {customer.email && <ContactItem icon={<Mail size={14} />} label="Email" value={customer.email} href={`mailto:${customer.email}`} />}
          {customer.owner && <ContactItem icon={<User size={14} />} label="Ответственный" value={customer.owner.full_name} />}
          <ContactItem icon={<Calendar size={14} />} label="Добавлен" value={format(new Date(customer.created_at), 'd MMM yyyy', { locale: ru })} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '4px', marginBottom: 16, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ padding: '6px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: activeTab === tab.key ? 'var(--color-amber)' : 'transparent', color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)', transition: 'background var(--transition-fast), color var(--transition-fast)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600 }}>Последняя активность</div>
                <div style={{ padding: '12px 18px' }}><NoteForm customerId={id!} onSuccess={() => qc.invalidateQueries({ queryKey: ['customer-activities', id] })} /></div>
                <div>
                  {(activities?.results ?? []).slice(0, 5).map(act => (
                    <div key={act.id} style={{ display: 'flex', gap: 10, padding: '10px 18px', borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }}>
                        {ACTIVITY_ICONS[act.type] ?? ACTIVITY_ICONS.default}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{(act.payload as any)?.body ?? act.type}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {act.actor?.full_name && <>{act.actor.full_name} · </>}
                          {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ru })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(activities?.results ?? []).length === 0 && <div style={{ padding: '20px 18px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>Активностей пока нет</div>}
                </div>
              </div>

              <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Сделки</span>
                  <button onClick={() => navigate('/deals')} style={{ fontSize: 12, color: 'var(--color-amber)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>+ Создать</button>
                </div>
                {(deals?.results ?? []).length === 0 ? <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>Сделок нет. Создайте первую.</div> : (deals?.results ?? []).map(deal => {
                  const formatAmount = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
                  const stageColors: Record<string, string> = { won: '#10B981', lost: '#EF4444', open: 'var(--color-amber)' };
                  return (
                    <motion.div key={deal.id} whileHover={{ backgroundColor: 'var(--color-bg-muted)' }} onClick={() => navigate(`/deals/${deal.id}`)} style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{deal.title}</span>
                        {deal.amount && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-amber)', fontFamily: 'var(--font-display)' }}>{formatAmount(deal.amount)} ₽</span>}
                      </div>
                      <div style={{ fontSize: 11, color: stageColors[deal.stage.type] ?? 'var(--color-text-muted)', marginTop: 3 }}>{deal.stage.name}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}><NoteForm customerId={id!} onSuccess={() => qc.invalidateQueries({ queryKey: ['customer-activities', id] })} /></div>
              <div>
                {(activities?.results ?? []).map((act, idx) => (
                  <motion.div key={act.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', flexShrink: 0 }}>{ACTIVITY_ICONS[act.type] ?? ACTIVITY_ICONS.default}</span>
                    <div>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{(act.payload as any)?.body ?? act.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        {act.actor?.full_name && <b>{act.actor.full_name}</b>}{act.actor && ' · '}
                        {format(new Date(act.created_at), 'd MMM, HH:mm', { locale: ru })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(activities?.results ?? []).length === 0 && <EmptyState icon={<Clock size={20} />} title="Активностей нет" subtitle="Добавьте заметку выше" />}
              </div>
            </div>
          )}

          {activeTab === 'deals' && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {(deals?.results ?? []).length === 0 ? <EmptyState icon={<Briefcase size={20} />} title="Сделок нет" subtitle="Создайте первую сделку" /> : (deals?.results ?? []).map(deal => {
                const formatAmount = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
                return (
                  <motion.div key={deal.id} whileHover={{ backgroundColor: 'var(--color-bg-muted)' }} onClick={() => navigate(`/deals/${deal.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{deal.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{deal.stage.name} · {format(new Date(deal.created_at), 'd MMM yyyy', { locale: ru })}</div>
                    </div>
                    {deal.amount && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-amber)' }}>{formatAmount(deal.amount)} ₽</span>}
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === 'fields' && id && <CustomFieldsTab entityType="customer" entityId={id} />}

          {activeTab === 'tasks' && (
            <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {(tasks?.results ?? []).length === 0 ? <EmptyState icon={<CheckSquare size={20} />} title="Задач нет" /> : (tasks?.results ?? []).map(task => {
                const priorityColors: Record<string, { bg: string; color: string }> = {
                  low: { bg: '#F3F4F6', color: '#6B7280' },
                  medium: { bg: '#FEF3C7', color: '#D97706' },
                  high: { bg: '#FEE2E2', color: '#DC2626' },
                };
                const pc = priorityColors[task.priority] ?? priorityColors.low;
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 'var(--radius-sm)', border: `2px solid ${task.status === 'done' ? '#10B981' : 'var(--color-border-strong)'}`, background: task.status === 'done' ? '#10B981' : 'transparent', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{task.title}</div>
                      {task.due_at && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{format(new Date(task.due_at), 'd MMM, HH:mm', { locale: ru })}</div>}
                    </div>
                    <Badge bg={pc.bg} color={pc.color}>{task.priority}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Drawer
        open={editDrawer}
        onClose={() => setEditDrawer(false)}
        title="Редактировать клиента"
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setEditDrawer(false)}>Отмена</Button><Button loading={editSubmitting} onClick={handleSubmit(d => updateMutation.mutate(d))}>Сохранить</Button></div>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {([
            { label: 'Имя *', name: 'full_name', placeholder: 'Иван Иванов' },
            { label: 'Компания', name: 'company_name', placeholder: 'ТОО Название' },
            { label: 'Телефон', name: 'phone', placeholder: '+7 700 000 00 00' },
            { label: 'Email', name: 'email', placeholder: 'ivan@company.kz' },
            { label: 'Источник', name: 'source', placeholder: 'Instagram' },
          ] as const).map(f => (
            <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{f.label}</label>
              <input {...register(f.name as any)} placeholder={f.placeholder} className="crm-input" />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Статус</label>
            <select {...register('status')} className="crm-select">
              <option value="new">Новый</option>
              <option value="active">Активный</option>
              <option value="inactive">Неактивный</option>
              <option value="archived">Архив</option>
            </select>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
