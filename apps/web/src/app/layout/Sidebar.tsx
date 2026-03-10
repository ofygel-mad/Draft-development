import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Briefcase, CheckSquare, BarChart2, Settings, Shield, Zap } from 'lucide-react';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Главная', always: true },
  { to: '/customers', icon: Users, label: 'Клиенты', always: true },
  { to: '/deals', icon: Briefcase, label: 'Сделки', always: true },
  { to: '/tasks', icon: CheckSquare, label: 'Задачи', always: true },
  { to: '/reports', icon: BarChart2, label: 'Отчёты', cap: 'reports.basic' },
  { to: '/automations', icon: Zap, label: 'Авто', cap: 'automations.manage' },
  { to: '/audit', icon: Shield, label: 'Аудит', cap: 'audit.read' },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { can } = useCapabilities();
  const visibleItems = NAV_ITEMS.filter((item) => item.always || (item.cap && can(item.cap)));

  return (
    <motion.aside className={styles.sidebar} style={{ width: 220 }}>
      <div className={styles.logo}><div className={styles.logoIcon}><span>C</span></div><AnimateText show><span className={styles.logoText}>CRM</span></AnimateText></div>
      <nav className={styles.nav}>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => onNavigate?.()} className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}>
            <Icon size={18} strokeWidth={1.75} />
            <AnimateText show><span>{label}</span></AnimateText>
          </NavLink>
        ))}
      </nav>
      <div className={styles.bottom}>
        <NavLink to="/settings" onClick={() => onNavigate?.()} className={styles.navItem}><Settings size={18} strokeWidth={1.75} /><AnimateText show><span>Настройки</span></AnimateText></NavLink>
      </div>
    </motion.aside>
  );
}

function AnimateText({ show, children }: { show: boolean; children: ReactNode }) {
  return <motion.div animate={{ opacity: show ? 1 : 0, width: show ? 'auto' : 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{children}</motion.div>;
}
