import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useAuthStore } from '../../shared/stores/auth';

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

export function Topbar() {
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
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>CRM</span>
        <ChevronRight size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{crumb}</span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search hint */}
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

        {/* Notifications (placeholder) */}
        <button style={{
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)',
        }}>
          <Bell size={16} />
        </button>

        {/* Avatar */}
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
