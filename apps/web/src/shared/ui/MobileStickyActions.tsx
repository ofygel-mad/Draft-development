import { ReactNode } from 'react';

export function MobileStickyActions({ children }: { children: ReactNode }) {
  return <div style={{ position: 'sticky', bottom: 12, zIndex: 40, display: 'flex', gap: 8, padding: 8, borderRadius: 'var(--radius-xl)', background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-md)' }}>{children}</div>;
}
