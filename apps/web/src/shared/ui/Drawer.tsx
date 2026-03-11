import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, children, width = 480, footer }: DrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 190 }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: '92dvh',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-strong)', margin: '10px auto 0', flexShrink: 0 }} />
              <div
                style={{
                  padding: '12px 20px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
                  {subtitle && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</p>}
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>{children}</div>
              {footer && <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>{footer}</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width,
              background: 'var(--color-bg-elevated)',
              borderLeft: '1px solid var(--color-border)',
              zIndex: 70, display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
                {subtitle && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>{children}</div>
            {footer && <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
