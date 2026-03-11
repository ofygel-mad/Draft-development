import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Skeleton } from '../../shared/ui/Skeleton';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Task {
  id:string; title:string; description:string;
  priority:'low'|'medium'|'high'; status:'open'|'done'|'cancelled';
  due_at:string|null; completed_at:string|null;
  assigned_to:{ id:string; full_name:string } | null;
  customer:{ id:string; full_name:string } | null;
  deal:{ id:string; title:string } | null;
  created_at:string;
}

const PRIORITY_COLORS = {
  low:    { bg:'#F3F4F6', color:'#6B7280' },
  medium: { bg:'#FEF3C7', color:'#D97706' },
  high:   { bg:'#FEE2E2', color:'#DC2626' },
};
const PRIORITY_LABELS = { low:'Низкий', medium:'Средний', high:'Высокий' };

const FILTERS = [
  { key:'mine',       label:'Мои' },
  { key:'due_today',  label:'Сегодня' },
  { key:'overdue',    label:'Просрочено' },
  { key:'',           label:'Все' },
];

export default function TasksPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('mine');

  useEffect(() => {
    const handler = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('crm:new-task', handler);
    return () => window.removeEventListener('crm:new-task', handler);
  }, []);

  const params: Record<string, string> = {};
  if (filter === 'mine')      params.mine      = '1';
  if (filter === 'due_today') params.due_today = '1';
  if (filter === 'overdue')   params.overdue   = '1';

  const { data, isLoading } = useQuery<{ results:Task[] }>({
    queryKey: ['tasks', filter],
    queryFn:  () => api.get('/tasks/', params),
  });

  const completeMutation = useMutation({
    mutationFn: (id:string) => api.post(`/tasks/${id}/complete/`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey:['tasks'] }); toast.success('Задача выполнена'); },
  });

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle={data ? `${data.results?.length ?? 0} задач` : undefined}
        actions={<Button icon={<Plus size={15}/>} size="sm">Новая задача</Button>}
      />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, padding:'4px', background:'var(--color-bg-muted)', borderRadius:'var(--radius-md)', width:'fit-content' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding:'6px 14px', fontSize:13, fontWeight:500, borderRadius:'var(--radius-sm)',
              background: filter===f.key ? 'var(--color-bg-elevated)' : 'transparent',
              color:      filter===f.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              border:     filter===f.key ? '1px solid var(--color-border)' : '1px solid transparent',
              cursor:'pointer', transition:'all var(--transition-fast)',
              fontFamily:'var(--font-body)',
              boxShadow: filter===f.key ? 'var(--shadow-xs)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {isLoading
          ? [1,2,3,4].map(i => (
              <div key={i} style={{ background:'var(--color-bg-elevated)', borderRadius:'var(--radius-md)', padding:'14px 16px', border:'1px solid var(--color-border)' }}>
                <Skeleton height={14} width="60%" style={{ marginBottom:8 }} />
                <Skeleton height={12} width="30%" />
              </div>
            ))
          : data?.results?.length === 0
            ? <EmptyState icon={<CheckSquare size={22}/>} title="Задач нет" subtitle="Задачи появятся, когда вы их создадите или вам их назначат" />
            : data?.results?.map((task, idx) => {
                const pc      = PRIORITY_COLORS[task.priority];
                const isDone  = task.status === 'done';
                const dueDate = task.due_at ? new Date(task.due_at) : null;
                const isOver  = dueDate && isPast(dueDate) && !isDone;
                const isDue   = dueDate && isToday(dueDate) && !isDone;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay:idx*0.03 }}
                    style={{
                      background:'var(--color-bg-elevated)',
                      border:     `1px solid ${isOver?'#FCA5A5':isDue?'#FDE68A':'var(--color-border)'}`,
                      borderRadius:'var(--radius-md)',
                      padding:'14px 16px',
                      display:'flex', alignItems:'flex-start', gap:12,
                      opacity: isDone ? 0.5 : 1,
                    }}
                  >
                    {/* Complete button */}
                    <button
                      onClick={() => !isDone && completeMutation.mutate(task.id)}
                      style={{ flexShrink:0, background:'none', border:'none', cursor:isDone?'default':'pointer', color: isDone?'#10B981':'var(--color-text-muted)', marginTop:1 }}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <CheckSquare size={18} />}
                    </button>

                    {/* Content */}
                    <div style={{ flex:1 }}>
                      <div style={{
                        fontSize:13, fontWeight:500,
                        textDecoration: isDone ? 'line-through' : 'none',
                        color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        marginBottom:4,
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        <Badge bg={pc.bg} color={pc.color}>{PRIORITY_LABELS[task.priority]}</Badge>
                        {task.customer && (
                          <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>
                            👤 {task.customer.full_name}
                          </span>
                        )}
                        {dueDate && (
                          <span style={{ fontSize:11, display:'flex', alignItems:'center', gap:3, color:isOver?'#DC2626':isDue?'#D97706':'var(--color-text-muted)' }}>
                            {isOver ? <AlertCircle size={11}/> : <Clock size={11}/>}
                            {format(dueDate, 'd MMM', { locale:ru })}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
        }
      </div>
    </div>
  );
}
