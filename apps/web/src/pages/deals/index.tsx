import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { formatNumber, currencySymbol } from '../../shared/utils/format';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Drawer } from '../../shared/ui/Drawer';
import { toast } from 'sonner';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useSuggestionsStore } from '../../shared/stores/suggestions';
import { nanoid } from 'nanoid';

interface DealCard {
  id:string; title:string; amount?:number; currency:string; status:string;
  customer:{ id:string; full_name:string; company_name?:string } | null;
  owner:{ id:string; full_name:string } | null;
  stage:{ id:string; name:string; color?:string };
  created_at:string;
}

interface Stage {
  id:string; name:string; type:'open'|'won'|'lost'; color:string;
  deals: DealCard[];
}

interface BoardData {
  pipeline: { id:string; name:string };
  stages: Stage[];
}

function DealCardItem({ deal, isDragging }: { deal:DealCard; isDragging?:boolean }) {
  const navigate = useNavigate();
  const orgCurrency = useAuthStore((s) => s.org?.currency ?? 'KZT');

  return (
    <motion.div
      layout
      onClick={() => !isDragging && navigate(`/deals/${deal.id}`)}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        cursor: 'pointer',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
        opacity: isDragging ? 0.95 : 1,
        transform: isDragging ? 'rotate(1.5deg)' : undefined,
      }}
    >
      <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>{deal.title}</div>
      {deal.customer && (
        <div style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:6 }}>
          {deal.customer.full_name}
          {deal.customer.company_name && ` • ${deal.customer.company_name}`}
        </div>
      )}
      {deal.amount && (
        <div style={{ fontSize:14, fontWeight:700, color:'var(--color-amber)', fontFamily:'var(--font-display)' }}>
          {formatNumber(deal.amount)} {currencySymbol(deal.currency || orgCurrency)}
        </div>
      )}
    </motion.div>
  );
}

function SortableDealCard({ deal }: { deal:DealCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:deal.id });
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <DealCardItem deal={deal} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({ stage, isLoading }: { stage:Stage; isLoading?:boolean }) {
  const orgCurrency = useAuthStore((s) => s.org?.currency ?? 'KZT');
  const typeColors: Record<string, { header:string; dot:string }> = {
    open: { header:'var(--color-bg-muted)', dot:'#9CA3AF' },
    won: { header:'#D1FAE5', dot:'#10B981' },
    lost: { header:'#FEE2E2', dot:'#EF4444' },
  };
  const tc = typeColors[stage.type] ?? typeColors.open;
  const total = stage.deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div style={{
      width: 272, flexShrink:0,
      display:'flex', flexDirection:'column',
      background:'var(--color-bg-muted)',
      borderRadius:'var(--radius-lg)',
      border:'1px solid var(--color-border)',
      overflow:'hidden',
      maxHeight:'calc(100vh - 160px)',
    }}>
      <div style={{
        padding:'12px 14px',
        background:tc.header,
        borderBottom:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:tc.dot,display:'inline-block',flexShrink:0 }} />
          <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{stage.name}</span>
          <span style={{ fontSize:12, color:'var(--color-text-muted)', background:'var(--color-bg-elevated)', padding:'1px 7px', borderRadius:'var(--radius-full)' }}>
            {stage.deals.length}
          </span>
        </div>
        {total > 0 && (
          <div style={{ fontSize:12, color:'var(--color-text-muted)', paddingLeft:16 }}>
            {formatNumber(total)} {currencySymbol(orgCurrency)}
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'10px', display:'flex', flexDirection:'column', gap:8 }}>
        <SortableContext items={stage.deals.map(d=>d.id)} strategy={verticalListSortingStrategy}>
          {isLoading
            ? [1,2,3].map(i => <div key={i} style={{ background:'var(--color-bg-elevated)', borderRadius:'var(--radius-md)', padding:12, border:'1px solid var(--color-border)' }}><Skeleton height={14} width="80%" style={{ marginBottom:8 }} /><Skeleton height={12} width="60%" /></div>)
            : stage.deals.length === 0
              ? <div style={{ textAlign:'center', padding:'20px 8px', color:'var(--color-text-muted)', fontSize:12 }}>Нет сделок</div>
              : stage.deals.map(deal => <SortableDealCard key={deal.id} deal={deal} />)
          }
        </SortableContext>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string|null>(null);
  const [createDrawer, setCreateDrawer] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = () => setCreateDrawer(true);
    window.addEventListener('crm:new-deal', handler);
    return () => window.removeEventListener('crm:new-deal', handler);
  }, []);

  const { data: customers } = useQuery<{ results: Array<{ id: string; full_name: string }> }>({
    queryKey: ['customers-select'],
    queryFn: () => api.get('/customers/', { page_size: 100 }),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { isSubmitting: creating } } = useForm<{
    title: string; amount?: number; customer_id?: string; expected_close_date?: string;
  }>();

  const createDealMutation = useMutation({
    mutationFn: (data: object) => api.post('/deals/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals-board'] });
      toast.success('Сделка создана');
      setCreateDrawer(false);
      resetCreate();
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:8 } }));

  const { data:board, isLoading } = useQuery<BoardData>({
    queryKey: ['deals-board'],
    queryFn: () => api.get('/deals/board'),
  });

  const changeStage = useMutation({
    mutationFn: ({ dealId, stageId }:{ dealId:string; stageId:string }) =>
      api.post(`/deals/${dealId}/change_stage/`, { stage_id:stageId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey:['deals-board'] });

      const targetStage = board?.stages.find((s) => s.id === vars.stageId);
      if (targetStage?.type === 'won') {
        const deal = board?.stages.flatMap((s) => s.deals).find((d) => d.id === vars.dealId);
        useSuggestionsStore.getState().push({
          id: nanoid(),
          emoji: '🎉',
          text: `Сделка "${deal?.title ?? ''}" выиграна! Попросить отзыв?`,
          dismissLabel: 'Создать задачу',
          action: () => {
            window.dispatchEvent(new CustomEvent('crm:new-task', {
              detail: { title: `Попросить отзыв по "${deal?.title}"`, dealId: vars.dealId },
            }));
          },
        });
      }
    },
    onError: () => toast.error('Ошибка при перемещении'),
  });

  const activeDeal = board?.stages.flatMap(s=>s.deals).find(d=>d.id===activeId);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetStage = board?.stages.find(s => s.id === over.id || s.deals.some(d=>d.id===over.id));
    if (!targetStage) return;
    changeStage.mutate({ dealId:active.id, stageId:targetStage.id });
  }

  const totalDeals = board?.stages.flatMap(s=>s.deals).length ?? 0;


  if (isLoading) {
    return (
      <div style={{ padding: isMobile ? '14px 16px' : '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Skeleton height={28} width={120} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton height={32} width={100} style={{ borderRadius: 8 }} />
            <Skeleton height={32} width={120} style={{ borderRadius: 8 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ minWidth: 260, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Skeleton height={16} width={80} />
                <Skeleton height={16} width={24} style={{ borderRadius: 99 }} />
              </div>
              {[1, 2, 3].map((j) => (
                <div key={j} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                  <Skeleton height={13} width="75%" style={{ marginBottom: 8 }} />
                  <Skeleton height={11} width="50%" style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton height={20} width={70} style={{ borderRadius: 99 }} />
                    <Skeleton height={20} width={50} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Сделки"
        subtitle={board?.pipeline?.name ?? ''}
        actions={<Button icon={<Plus size={15}/>} onClick={() => setCreateDrawer(true)}>Новая сделка</Button>}
      />

      {!isLoading && totalDeals === 0 && (
        <EmptyState
          icon={<Briefcase size={22}/>}
          title="Сделок пока нет"
          subtitle="Создайте первую сделку из карточки клиента или нажмите Новая сделка"
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={e=>setActiveId(e.active.id as string)} onDragEnd={handleDragEnd} onDragCancel={()=>setActiveId(null)}>
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:16, alignItems:'flex-start' }}>
          {(board?.stages ?? []).map(stage => (
            <KanbanColumn key={stage.id} stage={stage} isLoading={isLoading} />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCardItem deal={activeDeal} isDragging />}
        </DragOverlay>
      </DndContext>

      <Drawer
        open={createDrawer}
        onClose={() => setCreateDrawer(false)}
        title="Новая сделка"
        subtitle="Добавить сделку в воронку"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCreateDrawer(false)}>Отмена</Button>
            <Button loading={creating} onClick={handleCreate(d => createDealMutation.mutate(d))}>Создать</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Название *</label>
            <input {...regCreate('title', { required: true })} className="crm-input" placeholder="Проект / Заказ / Клиент" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Сумма</label>
            <input {...regCreate('amount')} type="number" className="crm-input" placeholder="0" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Клиент</label>
            <select {...regCreate('customer_id')} className="crm-select">
              <option value="">— Выбрать клиента —</option>
              {(customers?.results ?? []).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Дата закрытия</label>
            <input {...regCreate('expected_close_date')} type="date" className="crm-input" />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
