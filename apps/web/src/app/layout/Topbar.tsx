import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useAuthStore } from '../../shared/stores/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../shared/api/client';
import { AnimatePresence, motion } from 'framer-motion';
import { useSSE } from '../../shared/hooks/useSSE';
import { useUIStore } from '../../shared/stores/ui';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface Notification { id: string; title: string; body: string; is_read: boolean; created_at: string; }

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: 'var(--radius-md)',
          background: open ? 'var(--color-bg-muted)' : 'transparent',
          border: '1px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--color-text-secondary)', position: 'relative',
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%', background: '#EF4444',
          }} />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              top: 56, right: isMobile ? 8 : 16,
              width: isMobile ? 'calc(100vw - 16px)' : 320,
              maxWidth: 360,
              maxHeight: 400, overflowY: 'auto',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 'var(--z-drawer)' as any,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Уведомления</span>
              {unread > 0 && (
                <button onClick={() => markAllRead.mutate()}
                  style={{ fontSize: 11, color: 'var(--color-amber)', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Прочитать все
                </button>
              )}
            </div>
            {(data?.results ?? []).length === 0
              ? <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>Уведомлений нет</div>
              : (data?.results ?? []).map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
                    background: n.is_read ? 'transparent' : 'var(--color-amber-subtle)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{n.body}</div>
                  </div>
                ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BREADCRUMBS: Record<string, string> = {
  '/': 'Главная', '/customers': 'Клиенты', '/deals': 'Сделки',
  '/tasks': 'Задачи', '/reports': 'Отчёты', '/automations': 'Автоматизации',
  '/imports': 'Импорт', '/settings': 'Настройки', '/audit': 'Аудит',
};

export function Topbar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { toggle } = useCommandPalette();
  const user      = useAuthStore(s => s.user);
  const { theme, setTheme } = useUIStore();
  const isMobile  = useIsMobile();

  const crumb = BREADCRUMBS[location.pathname] ?? location.pathname.slice(1);

  return (
    <header style={{
      height: 'var(--topbar-height)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--color-bg-elevated)',
      position: 'sticky', top: 0, zIndex: 40,
      gap: 8,
    }}>
      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
          color: 'var(--color-text-secondary)', minWidth: 0 }}>
          {!isMobile && <span style={{ color: 'var(--color-text-muted)' }}>CRM</span>}
          {!isMobile && <ChevronRight size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {crumb}
          </span>
        </div>
      </div>

      {/* Right: search + bells + theme + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
        {/* Search button */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 7,
            padding: isMobile ? '6px' : '6px 10px',
            background: 'var(--color-bg-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)',
            fontSize: 13, cursor: 'pointer',
            width: isMobile ? 34 : 'auto',
            justifyContent: 'center',
          }}
        >
          <Search size={14} />
          {!isMobile && <span>Поиск</span>}
          {!isMobile && (
            <kbd style={{ padding: '1px 5px', background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 11 }}>
              ⌘K
            </kbd>
          )}
        </button>

        <NotificationBell />

        {/* Theme switcher — иконка-only на mobile */}
        {isMobile ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
            style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            {theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <Monitor size={14} />}
          </motion.button>
        ) : (
          <div style={{ display: 'flex', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', padding: 2, gap: 1 }}>
            {([['light', Sun], ['dark', Moon], ['system', Monitor]] as const).map(([t, Icon]) => (
              <motion.button
                key={t} onClick={() => setTheme(t)} whileTap={{ scale: 0.88 }}
                title={{ light: 'Светлая', dark: 'Тёмная', system: 'Системная' }[t]}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: theme === t ? 'var(--color-bg-elevated)' : 'transparent',
                  color: theme === t ? 'var(--color-amber)' : 'var(--color-text-muted)',
                  boxShadow: theme === t ? 'var(--shadow-xs)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={13} strokeWidth={1.75} />
              </motion.button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/settings')}
          style={{
            width: 32, height: 32, background: 'var(--color-amber)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  );
}
