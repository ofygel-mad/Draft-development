import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useUIStore } from '../../shared/stores/ui';
import { useKeyboardShortcuts } from '../../shared/hooks/useKeyboardShortcuts';
import { ShortcutsModal } from '../../shared/ui/ShortcutsModal';

const MOBILE_BP = 768;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOpen, toggle } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { sidebarCollapsed } = useUIStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);
  const location = useLocation();

  useKeyboardShortcuts({
    'n': () => window.dispatchEvent(new CustomEvent('crm:new-customer')),
    'd': () => window.dispatchEvent(new CustomEvent('crm:new-deal')),
    't': () => window.dispatchEvent(new CustomEvent('crm:new-task')),
    '/': () => toggle(),
    '?': () => setShortcutsOpen(true),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [toggle]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarW = isMobile ? 0 : sidebarCollapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      {!isMobile && (
        <motion.div
          style={{ flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}
          animate={{ width: sidebarW }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <Sidebar />
        </motion.div>
      )}

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'var(--color-bg-overlay)', zIndex: 200 }}
            />
            <motion.div
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 220, zIndex: 201 }}
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          mobileMenuButton={
            isMobile ? (
              <button
                onClick={() => setMobileOpen((o) => !o)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            ) : undefined
          }
        />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>{isOpen && <CommandPalette />}</AnimatePresence>
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
