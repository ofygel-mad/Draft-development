import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Bell } from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useAuthStore } from '../../shared/stores/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../shared/api/client';
import { AnimatePresence, motion } from 'framer-motion';
import { useSSE } from '../../shared/hooks/useSSE';

interface Notification { id: string; title: string; body: string; is_read: boolean; created_at: string; }

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ results: Notification[]; count: number }>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/'),
    refetchInterval: 30_000,
  });

  useSSE({ onNotification: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); } });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read_all/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = (data?.results ?? []).filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: 'var(--radius-md)',
          background: open ? 'var(--color-bg-muted)' : 'transparent',
          border: '1px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--color-text-secondary)',
          position: 'relative',
        }}
      >
        <Bell size={16}/>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: '#EF4444',
            animation: 'pulse-dot 2s infinite',
          }}/>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 320, maxHeight: 400, overflowY: 'auto',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 'var(--z-drawer)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Уведомления</span>
              {unread > 0 && (
                <button onClick={() => markAllRead.mutate()} style={{ fontSize: 11, color: 'var(--color-amber)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Прочитать все
                </button>
              )}
            </div>
            {(data?.results ?? []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>Уведомлений нет</div>
            ) : (
              (data?.results ?? []).map(n => (
                <div key={n.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
                  background: n.is_read ? 'transparent' : 'var(--color-amber-subtle)',
                  transition: 'background var(--transition-fast)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{n.body}</div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BREADCRUMBS: Record<string, string> = {
  '/': 'Главная',
  '/customers': 'Клиенты',
  '/deals': 'Сделки',
  '/tasks': 'Задачи',
  '/reports': 'Отчёты',
  '/automations': 'Автоматизации',
  '/imports': 'Импорт',
  '/settings': 'Настройки',
};

export function Topbar({ mobileMenuButton }: { mobileMenuButton?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggle } = useCommandPalette();
  const user = useAuthStore(s => s.user);

  const crumb = BREADCRUMBS[location.pathname] ?? location.pathname.slice(1);

  return (
    <header style={{
      height: 'var(--topbar-height)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: 'var(--color-bg-elevated)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div>{mobileMenuButton}</div><div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>CRM</span>
        <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{crumb}</span>
      </div></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'var(--color-bg-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Search size={14} />
          <span>Поиск</span>
          <kbd style={{
            padding: '1px 5px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            fontSize: 11,
          }}>⌘K</kbd>
        </button>

        <NotificationBell />

        <button
          onClick={() => navigate('/settings')}
          style={{
            width: 32, height: 32,
            background: 'var(--color-amber)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 600, fontSize: 13,
            border: 'none', cursor: 'pointer',
          }}
        >
          {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  );
}
