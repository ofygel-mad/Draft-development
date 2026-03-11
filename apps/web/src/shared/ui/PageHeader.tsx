import type { ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: Props) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: isMobile ? 10 : 0,
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div>
        <h1 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2, marginBottom: 0 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
