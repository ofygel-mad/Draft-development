import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useCommandPalette } from '../../shared/stores/commandPalette';

const SIDEBAR_WIDTH = 220;
const MOBILE_BREAKPOINT = 768;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOpen, toggle } = useCommandPalette();
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onDown);

    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      document.removeEventListener('keydown', onDown);
    };
  }, [toggle]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-base)', position: 'relative' }}>
      {!isMobile && <div style={{ width: SIDEBAR_WIDTH, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}><Sidebar /></div>}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'var(--color-bg-overlay)', zIndex: 200 }} />
            <motion.div initial={{ x: -SIDEBAR_WIDTH }} animate={{ x: 0 }} exit={{ x: -SIDEBAR_WIDTH }} transition={{ type: 'spring', stiffness: 400, damping: 40 }} style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, zIndex: 201 }}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar mobileMenuButton={isMobile ? <button onClick={() => setMobileOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>{mobileOpen ? <X size={16} /> : <Menu size={16} />}</button> : undefined} />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}><Outlet /></main>
      </div>
      <AnimatePresence>{isOpen && <CommandPalette />}</AnimatePresence>
      <Toaster position="bottom-right" />
    </div>
  );
}
