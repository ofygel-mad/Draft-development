import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  danger?: boolean;
  divider?: boolean;
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 196;
  const menuH = items.length * 36 + 16;
  const cx = x + menuW > vw ? x - menuW : x;
  const cy = y + menuH > vh ? y - menuH : y;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'fixed', top: cy, left: cx, zIndex: 300,
          width: menuW, background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: '4px',
          transformOrigin: 'top left',
        }}
      >
        {items.map((item, i) => item.divider
          ? <div key={i} style={{ height: 1, background: 'var(--color-border)', margin: '3px 8px' }} />
          : (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, color: item.danger ? '#EF4444' : (item.color ?? 'var(--color-text-primary)'),
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = item.danger ? '#FEE2E2' : 'var(--color-bg-muted)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {item.icon && <span style={{ opacity: 0.75, flexShrink: 0 }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
      </motion.div>
    </AnimatePresence>
  );
}
