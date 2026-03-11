import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSuggestionsStore } from '../../shared/stores/suggestions';

export function SmartSuggestions() {
  const { items, dismiss } = useSuggestionsStore();

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 700, maxWidth: 320,
    }}>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 48, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                {item.text}
              </div>
              <button
                onClick={() => { item.action(); dismiss(item.id); }}
                style={{
                  marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, fontSize: 12, fontWeight: 600,
                  color: 'var(--color-amber)', textDecoration: 'underline',
                }}
              >
                {item.dismissLabel ?? 'Сделать'}
              </button>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', display: 'flex',
                padding: 2, flexShrink: 0,
              }}
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
