import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: 'N', description: 'Новый клиент' },
  { key: 'D', description: 'Новая сделка' },
  { key: 'T', description: 'Новая задача' },
  { key: '/', description: 'Поиск (Command Palette)' },
  { key: '?', description: 'Показать шорткаты' },
  { key: 'Esc', description: 'Закрыть диалог' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'var(--color-bg-overlay)', zIndex: 500 }}/>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 400, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', zIndex: 501, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Keyboard size={16} style={{ color: 'var(--color-amber)' }}/>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Горячие клавиши</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', display: 'flex', borderRadius: 'var(--radius-sm)', padding: 3 }}>
                <X size={15}/>
              </button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {SHORTCUTS.map((s, i) => (
                <motion.div key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 20px', borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.description}</span>
                  <kbd style={{ padding: '3px 9px', background: 'var(--color-bg-muted)',
                    border: '1px solid var(--color-border)', borderBottom: '2px solid var(--color-border-strong)',
                    borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-mono)' }}>
                    {s.key}
                  </kbd>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
