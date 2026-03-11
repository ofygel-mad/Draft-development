type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber';

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string }> = {
  default: { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-muted)' },
  success: { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  warning: { color: '#92400E', bg: 'var(--color-warning-light)' },
  danger: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)' },
  info: { color: 'var(--color-info)', bg: 'var(--color-info-light)' },
  amber: { color: 'var(--color-amber-dark)', bg: 'var(--color-amber-light)' },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: string;
  bg?: string;
  dot?: boolean;
}

export function Badge({ children, variant, color, bg, dot }: BadgeProps) {
  const resolved = variant ? VARIANT_STYLES[variant] : undefined;
  const finalColor = color ?? resolved?.color ?? VARIANT_STYLES.default.color;
  const finalBg = bg ?? resolved?.bg ?? VARIANT_STYLES.default.bg;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        gap: dot ? 5 : 0,
        fontSize: 11,
        fontWeight: 500,
        color: finalColor,
        background: finalBg,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: finalColor, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
