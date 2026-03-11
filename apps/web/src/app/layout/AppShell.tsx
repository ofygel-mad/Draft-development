import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from '../../widgets/command-palette/CommandPalette';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { useUIStore } from '../../shared/stores/ui';
import { useKeyboardShortcuts } from '../../shared/hooks/useKeyboardShortcuts';
import { ShortcutsModal } from '../../shared/ui/ShortcutsModal';
import { FocusMode } from '../../widgets/focus-mode/FocusMode';
import { SmartSuggestions } from '../../widgets/smart-suggestions/SmartSuggestions';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { useAuthStore } from '../../shared/stores/auth';
import { api } from '../../shared/api/client';
import { MobileFab } from '../../shared/ui/MobileFab';
import { AiAssistant } from '../../widgets/ai-assistant/AiAssistant';

export function AppShell() {
  const { isOpen, toggle } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { sidebarCollapsed, toggleFocusMode } = useUIStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    api.get<any>('/auth/me')
      .then((data) => {
        setAuth(
          data.user,
          data.org,
          useAuthStore.getState().token!,
          useAuthStore.getState().refreshToken!,
          data.capabilities ?? [],
          data.role ?? 'viewer',
        );
        if (!data.onboarding_completed && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        clearAuth();
        navigate('/auth/login', { replace: true });
      });
  }, []);

  useKeyboardShortcuts({
    n: () => window.dispatchEvent(new CustomEvent('crm:new-customer')),
    d: () => window.dispatchEvent(new CustomEvent('crm:new-deal')),
    t: () => window.dispatchEvent(new CustomEvent('crm:new-task')),
    f: () => toggleFocusMode(),
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
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
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

      {isMobile && <MobileNav />}
      <MobileFab />
      <AiAssistant />

      <AnimatePresence>{isOpen && <CommandPalette />}</AnimatePresence>
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <FocusMode />
      <SmartSuggestions />
    </div>
  );
}
