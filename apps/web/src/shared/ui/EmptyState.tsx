import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  steps?: string[];
}

export function EmptyState({ icon, title, subtitle, action, steps }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      {icon && (
        <div
          style={{
            width: 52,
            height: 52,
            background: 'var(--color-bg-muted)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ maxWidth: 320 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{subtitle}</p>}
      </div>
      {steps && steps.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 4,
            padding: '12px 16px',
            background: 'var(--color-bg-muted)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
          }}
        >
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'var(--color-amber)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{step}</span>
              {i < steps.length - 1 && <ArrowRight size={10} style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}
