import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play, Pause, RotateCcw, Focus, CheckSquare } from 'lucide-react';
import { useUIStore } from '../../shared/stores/ui';
import { api } from '../../shared/api/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const WORK_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

function usePomodoro() {
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(WORK_SEC);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setLeft((n) => {
          if (n <= 1) {
            clearInterval(ref.current!);
            setRunning(false);
            if (phase === 'work') {
              setPhase('break');
              setLeft(BREAK_SEC);
              toast.success('🎉 Перерыв 5 минут!');
            } else {
              setPhase('work');
              setLeft(WORK_SEC);
              toast('⏱ Пора работать!');
            }
            return 0;
          }
          return n - 1;
        });
      }, 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }

    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running, phase]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => { setRunning(false); setPhase('work'); setLeft(WORK_SEC); };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return { display: `${mm}:${ss}`, running, phase, toggle, reset };
}

interface Task {
  id: string; title: string; priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done'; due_at: string | null;
}

const PRIORITY_DOT: Record<string, string> = {
  high: '#EF4444', medium: '#F59E0B', low: '#9CA3AF',
};

export function FocusMode() {
  const { focusMode, toggleFocusMode } = useUIStore();
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tasks } = useQuery<{ results: Task[] }>({
    queryKey: ['tasks', 'focus', today],
    queryFn: () => api.get('/tasks/', { filter: 'due_today', status: 'open' }),
    enabled: focusMode,
  });

  const doneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/`, { status: 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const pomodoro = usePomodoro();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape' && focusMode) toggleFocusMode();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusMode, toggleFocusMode]);

  const list = tasks?.results ?? [];
  const open = list.filter((t) => t.status === 'open');
  const done = list.filter((t) => t.status === 'done');

  return (
    <AnimatePresence>
      {focusMode && (
        <>
          <motion.div
            key="focus-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 800,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            }}
          />
          <motion.div
            key="focus-panel"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 801, width: 480,
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Focus size={16} style={{ color: 'var(--color-amber)' }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Режим фокуса</span>
              </div>
              <button onClick={toggleFocusMode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 3, borderRadius: 'var(--radius-sm)' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: pomodoro.phase === 'work' ? 'var(--color-amber)' : '#10B981', letterSpacing: -2, lineHeight: 1 }}>
                {pomodoro.display}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                {pomodoro.phase === 'work' ? '⏱ Рабочий блок' : '☕ Перерыв'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={pomodoro.toggle} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-amber)', border: 'none', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 600 }}>
                  {pomodoro.running ? <Pause size={14} /> : <Play size={14} />}
                  {pomodoro.running ? 'Пауза' : 'Старт'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={pomodoro.reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  <RotateCcw size={13} />
                </motion.button>
              </div>
            </div>
            <div style={{ padding: '12px 20px 20px', maxHeight: 300, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Задачи на сегодня — {open.length} открыто
              </div>
              {open.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  <CheckSquare size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>Все задачи выполнены 🎉</div>
                </div>
              )}
              {open.map((task) => (
                <motion.div key={task.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: PRIORITY_DOT[task.priority] }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{task.title}</span>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => doneMutation.mutate(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 2 }}>
                    <Check size={15} />
                  </motion.button>
                </motion.div>
              ))}
              {done.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
                  ✓ Выполнено: {done.length}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
