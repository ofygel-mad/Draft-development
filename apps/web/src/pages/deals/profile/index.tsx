import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, Edit3, User, Calendar, TrendingUp, Clock } from 'lucide-react';
import { api } from '../../../shared/api/client';
import { Button } from '../../../shared/ui/Button';
import { PageLoader } from '../../../shared/ui/PageLoader';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Drawer } from '../../../shared/ui/Drawer';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DealDetail {
  id: string; title: string; amount: number | null; currency: string;
  status: string; created_at: string;
  customer: { id: string; full_name: string; company_name: string; phone: string } | null;
  owner: { id: string; full_name: string } | null;
  stage: { id: string; name: string; type: string };
  pipeline: { id: string; name: string; stages: Array<{ id: string; name: string; position: number; type: string }> };
  expected_close_date: string | null;
}

interface Activity { id: string; type: string; payload: Record<string, unknown>; actor: { full_name: string } | null; created_at: string; }

export default function DealProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editDrawer, setEditDrawer] = useState(false);

  const { data: deal, isLoading } = useQuery<DealDetail>({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}/`),
  });
  const { data: activities } = useQuery<{ results: Activity[] }>({
    queryKey: ['deal-activities', id],
    queryFn: () => api.get(`/deals/${id}/activities/`),
  });

  const changeStage = useMutation({
    mutationFn: (stageId: string) => api.post(`/deals/${id}/change_stage/`, { stage_id: stageId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Этап изменён'); },
  });

  const { register, handleSubmit, reset: resetEdit, formState: { isSubmitting } } = useForm<Partial<DealDetail>>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DealDetail>) => api.patch(`/deals/${id}/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Сделка обновлена'); setEditDrawer(false); },
  });

  if (isLoading) return <PageLoader />;
  if (!deal) return <EmptyState icon={<TrendingUp size={22} />} title="Сделка не найдена" />;

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
  const stages = [...deal.pipeline.stages].sort((a, b) => a.position - b.position);
  const currentStageIndex = stages.findIndex(s => s.id === deal.stage.id);

  return (
    <div style={{ maxWidth: 1000, animation: 'slideUp 0.25s ease' }}>
      <button onClick={() => navigate('/deals')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
        <ChevronLeft size={16} /> Назад к сделкам
      </button>

      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>{deal.title}</h1>
            {deal.amount && <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-amber)', fontFamily: 'var(--font-display)', marginTop: 4 }}>{fmt(deal.amount)} {deal.currency === 'RUB' ? '₽' : deal.currency}</div>}
          </div>
          <Button variant="secondary" size="sm" icon={<Edit3 size={13} />} onClick={() => { resetEdit(deal); setEditDrawer(true); }}>Редактировать</Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{deal.pipeline.name}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {stages.map((stage, idx) => {
              const isActive = stage.id === deal.stage.id;
              const isPast = idx < currentStageIndex;
              const dotColor = stage.type === 'won' ? '#10B981' : stage.type === 'lost' ? '#EF4444' : 'var(--color-amber)';
              return (
                <motion.button key={stage.id} onClick={() => changeStage.mutate(stage.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} title={stage.name} style={{ flex: 1, height: 6, borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', background: isActive ? dotColor : isPast ? `${dotColor}55` : 'var(--color-border)', transition: 'background var(--transition-fast)' }} />
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-amber)', fontWeight: 600, marginTop: 6 }}>{deal.stage.name}</div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {deal.customer && (() => {
            const customer = deal.customer;
            return <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate(`/customers/${customer.id}`)}>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}><User size={13} /></span>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Клиент</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-amber)' }}>{customer.full_name}</div></div>
            </div>;
          })()}
          {deal.owner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}><User size={13} /></span>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Ответственный</div><div style={{ fontSize: 13, fontWeight: 500 }}>{deal.owner.full_name}</div></div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}><Calendar size={13} /></span>
            <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Создана</div><div style={{ fontSize: 13, fontWeight: 500 }}>{format(new Date(deal.created_at), 'd MMM yyyy', { locale: ru })}</div></div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600 }}>Лента активности</div>
        {(activities?.results ?? []).length === 0 ? <EmptyState icon={<Clock size={20} />} title="Активностей нет" subtitle="Изменения сделки будут отображаться здесь" /> : (activities?.results ?? []).map((act, idx) => (
          <motion.div key={act.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }} style={{ display: 'flex', gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', flexShrink: 0 }}><Clock size={13} /></span>
            <div>
              <div style={{ fontSize: 12 }}>{(act.payload as any)?.body ?? act.type}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{act.actor?.full_name && <b>{act.actor.full_name}</b>}{act.actor && ' · '}{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ru })}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <Drawer open={editDrawer} onClose={() => setEditDrawer(false)} title="Редактировать сделку" footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setEditDrawer(false)}>Отмена</Button><Button loading={isSubmitting} onClick={handleSubmit(d => updateMutation.mutate(d))}>Сохранить</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Название *</label><input {...register('title')} className="crm-input" /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Сумма</label><input {...register('amount')} type="number" className="crm-input" placeholder="0" /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Дата закрытия</label><input {...register('expected_close_date')} type="date" className="crm-input" /></div>
        </div>
      </Drawer>
    </div>
  );
}
