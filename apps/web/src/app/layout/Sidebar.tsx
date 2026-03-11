import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  BarChart2,
  Settings,
  Shield,
  Zap,
  Upload,
  ChevronLeft,
} from 'lucide-react';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useUIStore } from '../../shared/stores/ui';
import { useAuthStore } from '../../shared/stores/auth';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Главная', always: true },
  { to: '/customers', icon: Users, label: 'Клиенты', always: true },
  { to: '/deals', icon: Briefcase, label: 'Сделки', always: true },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи', always: true },
  { to: '/reports', icon: BarChart2, label: 'Отчёты', cap: 'reports.basic' },
  { to: '/imports', icon: Upload, label: 'Импорт', cap: 'customers.import' },
  { to: '/automations', icon: Zap, label: 'Автоматизации', cap: 'automations.manage' },
  { to: '/audit', icon: Shield, label: 'Аудит', cap: 'audit.read' },
  { to: '/admin', icon: Shield, label: 'Админ-панель', adminOnly: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { can } = useCapabilities();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const role = useAuthStore((s) => s.role);
  const visible = NAV.filter((i) => i.always || (i.cap && can(i.cap)) || (i.adminOnly && (role === 'owner' || role === 'admin')));

  return (
    <motion.aside
      className={styles.sidebar}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <span>C</span>
        </div>
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.span
              className={styles.logoText}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              CRM
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className={styles.nav}>
        {visible.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => onNavigate?.()}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
          >
            <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.13 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 13 }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <NavLink
          to="/settings"
          onClick={() => onNavigate?.()}
          title={sidebarCollapsed ? 'Настройки' : undefined}
          className={styles.navItem}
        >
          <Settings size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.13 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 13 }}
              >
                Настройки
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        <motion.button
          className={styles.collapseBtn}
          onClick={toggleSidebar}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
          style={{ color: 'var(--color-text-muted)', width: '100%' }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <ChevronLeft size={15} />
          </motion.div>
        </motion.button>
      </div>
    </motion.aside>
  );
}
