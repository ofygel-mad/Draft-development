import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Users, Briefcase, CheckSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

const ACTIONS = [
  { icon: <Users size={18} />, label: 'Клиент', event: 'crm:new-customer', path: '/customers' },
  { icon: <Briefcase size={18} />, label: 'Сделка', event: 'crm:new-deal', path: '/deals' },
  { icon: <CheckSquare size={18} />, label: 'Задача', event: 'crm:new-task', path: '/tasks' },
];

export function MobileFab() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  function handleAction(action: typeof ACTIONS[number]) {
    setOpen(false);
    navigate(action.path);
    setTimeout(() => window.dispatchEvent(new Event(action.event)), 100);
    if ('vibrate' in navigator) navigator.vibrate(8);
  }

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 80, zIndex: 70 }}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 68 }}
            />
            {ACTIONS.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, y: 16, scale: 0.8 }}
                onClick={() => handleAction(action)}
                style={{
                  position: 'absolute',
                  bottom: (i + 1) * 56,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  zIndex: 69,
                }}
              >
                <span style={{ color: 'var(--color-amber)' }}>{action.icon}</span>
                {action.label}
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => {
          setOpen((o) => !o);
          if ('vibrate' in navigator) navigator.vibrate(6);
        }}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--color-amber)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(217,119,6,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          zIndex: 70,
          position: 'relative',
        }}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </motion.button>
    </div>
  );
}
