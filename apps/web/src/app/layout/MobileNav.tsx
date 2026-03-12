import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, CheckSquare, MoreHorizontal, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePwaInstall } from '../../shared/hooks/usePwaInstall';

const PRIMARY_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Главная' },
  { to: '/customers', icon: Users, label: 'Клиенты' },
  { to: '/deals', icon: Briefcase, label: 'Сделки' },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи' },
];

const MORE_LABELS: Record<string, string> = {
  '/reports': 'Отчёты',
  '/imports': 'Импорт',
  '/automations': 'Автоматизации',
  '/settings': 'Настройки',
  '/audit': 'Аудит',
};

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { canInstall, install } = usePwaInstall();

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                position: 'fixed',
                bottom: 68,
                right: 12,
                zIndex: 99,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                minWidth: 160,
              }}
            >
              {Object.keys(MORE_LABELS).map((to) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'block',
                    padding: '11px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {MORE_LABELS[to]}
                </NavLink>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <nav className="mobile-nav">
        {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="mobile-nav-item" onClick={() => setMoreOpen((o) => !o)}>
          <MoreHorizontal size={20} strokeWidth={1.75} />
          <span>Ещё</span>
        </button>
      </nav>
      {canInstall && <button onClick={install} style={{ position: 'fixed', right: 16, bottom: 80, zIndex: 50 }}><Smartphone size={18} /> Установить</button>}
    </>
  );
}
