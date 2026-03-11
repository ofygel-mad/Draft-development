import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Building2, Users, GitBranch, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRole } from '../../shared/hooks/useRole';

interface Pipeline { id: string; name: string; is_default: boolean; stages: PipelineStage[]; }
interface PipelineStage { id: string; name: string; stage_type: string; color: string; position: number; }

function SortableStageRow({ stage, onEdit, onDelete, typeLabel, typeColor }: {
  stage: PipelineStage; onEdit: () => void; onDelete: () => void; typeLabel: string; typeColor: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-muted)', display: 'flex' }}><GripVertical size={16}/></div>
      <div style={{ width: 12, height: 12, borderRadius: 'var(--radius-sm)', background: stage.color, flexShrink: 0 }}/>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{stage.name}</div>
      <span style={{ fontSize: 11, color: typeColor, fontWeight: 600 }}>{typeLabel}</span>
      <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 4, borderRadius: 'var(--radius-sm)' }}><Pencil size={13}/></button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 4, borderRadius: 'var(--radius-sm)' }}><Trash2 size={13}/></button>
    </div>
  );
}

const SECTIONS = [
  { key: 'organization', label: 'Организация', icon: <Building2 size={16}/> },
  { key: 'team', label: 'Команда', icon: <Users size={16}/> },
  { key: 'pipelines', label: 'Воронки', icon: <GitBranch size={16}/> },
  { key: 'mode', label: 'Режим CRM', icon: <Shield size={16}/> },
];

const MODE_LABELS: Record<string, string> = {
  basic: 'Базовый', advanced: 'Продвинутый', industrial: 'Промышленный',
};
const MODE_COLORS: Record<string, string> = {
  basic: '#3B82F6', advanced: '#D97706', industrial: '#8B5CF6',
};

interface OrgData { id: string; name: string; mode: string; industry: string; company_size: string; timezone: string; currency: string; }
interface UserItem { id: string; full_name: string; email: string; status: string; role?: string; }

function OrgSection() {
  const qc = useQueryClient();
  const { data: org } = useQuery<OrgData>({ queryKey: ['organization'], queryFn: () => api.get('/organization/') });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Partial<OrgData>>();
  const mutation = useMutation({
    mutationFn: (d: Partial<OrgData>) => api.patch('/organization/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization'] }); toast.success('Сохранено'); },
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {([
        ['name',     'Название организации'],
        ['timezone', 'Часовой пояс'],
        ['currency', 'Валюта по умолчанию'],
      ] as const).map(([field, label]) => (
        <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>
          <input {...register(field)} defaultValue={(org as any)?.[field] ?? ''} className="crm-input"/>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button loading={isSubmitting} onClick={handleSubmit(d => mutation.mutate(d))}>Сохранить</Button>
      </div>
    </div>
  );
}

function TeamSection() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const { data: team, isLoading } = useQuery<{ results: UserItem[] }>({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team/'),
  });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Роль обновлена');
    },
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm">+ Пригласить</Button>
      </div>
      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {isLoading ? [1, 2, 3].map(i => <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}><Skeleton height={14} width="50%"/></div>)
          : (team?.results ?? []).map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--color-amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-amber)' }}>
                  {member.full_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{member.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{member.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge bg={member.status === 'active' ? '#D1FAE5' : '#F3F4F6'} color={member.status === 'active' ? '#065F46' : '#6B7280'}>
                  {member.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
                {isAdmin && (
                  <select
                    value={member.role ?? 'viewer'}
                    onChange={(e) => setRole.mutate({ userId: member.id, role: e.target.value })}
                    className="crm-input"
                    style={{ fontSize: 12, padding: '3px 8px', width: 'auto' }}
                  >
                    <option value="admin">Администратор</option>
                    <option value="manager">Менеджер</option>
                    <option value="viewer">Наблюдатель</option>
                  </select>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
function PipelinesSection() {
  const qc = useQueryClient();
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [editingStage, setEditingStage] = useState<{ id: string; name: string; color: string } | null>(null);

  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/pipelines/'),
    select: (d: any) => d.results ?? d,
  });

  const pipeline = pipelines?.find(p => p.id === selectedPipeline) ?? pipelines?.[0] ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    if (pipeline?.stages) setStages([...pipeline.stages].sort((a, b) => a.position - b.position));
  }, [pipeline]);

  const reorderMutation = useMutation({
    mutationFn: ({ pipelineId, order }: { pipelineId: string; order: string[] }) =>
      api.post(`/pipelines/${pipelineId}/stages/reorder/`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const addStageMutation = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: string; name: string }) =>
      api.post(`/pipelines/${pipelineId}/stages/`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setNewStageName('');
      setAddingStage(false);
      toast.success('Стадия добавлена');
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      api.delete(`/pipelines/${pipelineId}/stages/${stageId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }); toast.success('Удалено'); },
    onError: () => toast.error('Нельзя удалить: есть активные сделки'),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId, data }: { pipelineId: string; stageId: string; data: any }) =>
      api.patch(`/pipelines/${pipelineId}/stages/${stageId}/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }); setEditingStage(null); },
  });

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id || !pipeline) return;
    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex);
    setStages(reordered);
    reorderMutation.mutate({ pipelineId: pipeline.id, order: reordered.map(s => s.id) });
  }

  const STAGE_TYPE_LABELS: Record<string, string> = { open: 'Открыта', won: 'Выиграна', lost: 'Проиграна' };
  const STAGE_TYPE_COLORS: Record<string, string> = { open: '#6B7280', won: '#10B981', lost: '#EF4444' };
  const PALETTE = ['#6B7280','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#EC4899','#06B6D4'];

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Skeleton height={20} width="60%"/></div>;

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Воронки</div>
        {(pipelines ?? []).map(p => (
          <div
            key={p.id}
            onClick={() => setSelectedPipeline(p.id)}
            style={{
              padding: '8px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 4, fontSize: 13,
              background: (pipeline?.id === p.id) ? 'var(--color-bg-muted)' : 'transparent',
              fontWeight: (pipeline?.id === p.id) ? 600 : 400,
              color: (pipeline?.id === p.id) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {p.name}
            {p.is_default && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-amber)', fontWeight: 600 }}>DEFAULT</span>}
          </div>
        ))}
      </div>

      {pipeline && (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{pipeline.name}</div>
            <Button size="sm" variant="amber-outline" onClick={() => setAddingStage(true)}>+ Стадия</Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stages.map(stage => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onEdit={() => setEditingStage({ id: stage.id, name: stage.name, color: stage.color })}
                    onDelete={() => deleteStageMutation.mutate({ pipelineId: pipeline.id, stageId: stage.id })}
                    typeLabel={STAGE_TYPE_LABELS[stage.stage_type]}
                    typeColor={STAGE_TYPE_COLORS[stage.stage_type]}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <AnimatePresence>
            {addingStage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 8, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addStageMutation.mutate({ pipelineId: pipeline.id, name: newStageName }); if (e.key === 'Escape') setAddingStage(false); }}
                  placeholder="Название стадии..."
                  className="crm-input"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <Button size="sm" loading={addStageMutation.isPending} onClick={() => addStageMutation.mutate({ pipelineId: pipeline.id, name: newStageName })}>Добавить</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingStage(false)}>Отмена</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {editingStage && (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg-overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-xl)', padding: 24, width: 360, boxShadow: 'var(--shadow-xl)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Редактировать стадию</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
                  <input
                    value={editingStage.name}
                    onChange={e => setEditingStage(s => s ? { ...s, name: e.target.value } : null)}
                    className="crm-input"
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Цвет</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PALETTE.map(c => (
                      <div key={c} onClick={() => setEditingStage(s => s ? { ...s, color: c } : null)}
                        style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: c, cursor: 'pointer', border: editingStage.color === c ? '3px solid var(--color-text-primary)' : '3px solid transparent', transition: 'border var(--transition-fast)' }}/>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={() => setEditingStage(null)}>Отмена</Button>
                  <Button loading={updateStageMutation.isPending} onClick={() => updateStageMutation.mutate({ pipelineId: pipeline.id, stageId: editingStage.id, data: { name: editingStage.name, color: editingStage.color } })}>Сохранить</Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeSection() {
  const { data: org } = useQuery<OrgData>({ queryKey: ['organization'], queryFn: () => api.get('/organization/') });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (mode: string) => api.patch('/organization/mode/', { mode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization'] }); toast.success('Режим изменён'); },
  });
  const modes = ['basic', 'advanced', 'industrial'] as const;
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Режим определяет набор доступных функций и сложность интерфейса.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modes.map(m => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.01 }}
            onClick={() => mutation.mutate(m)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: `2px solid ${org?.mode === m ? MODE_COLORS[m] : 'var(--color-border)'}`,
              background: org?.mode === m ? `${MODE_COLORS[m]}08` : 'var(--color-bg-elevated)',
              fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: MODE_COLORS[m] }}/>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{MODE_LABELS[m]}</span>
            </div>
            {org?.mode === m && <span style={{ fontSize: 11, color: MODE_COLORS[m], fontWeight: 600 }}>Текущий</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('organization');

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title="Настройки" subtitle="Управление организацией и системой" />

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(sec => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                background: activeSection === sec.key ? 'var(--color-amber-subtle)' : 'transparent',
                color: activeSection === sec.key ? 'var(--color-amber-dark)' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span style={{ color: activeSection === sec.key ? 'var(--color-amber)' : 'var(--color-text-muted)' }}>{sec.icon}</span>
              {sec.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
          >
            {activeSection === 'organization' && <OrgSection />}
            {activeSection === 'team' && <TeamSection />}
            {activeSection === 'mode' && <ModeSection />}
            {activeSection === 'pipelines' && <PipelinesSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
