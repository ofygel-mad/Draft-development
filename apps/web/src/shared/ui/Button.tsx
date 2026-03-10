import { motion, type HTMLMotionProps } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber-outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  letterSpacing: '0.01em',
  border: 'none',
  transition: 'background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)',
  flexShrink: 0,
};

const VARIANTS: Record<string, CSSProperties> = {
  primary: { background: 'var(--color-amber-gradient)', color: '#fff', boxShadow: 'var(--shadow-amber)' },
  secondary: { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border)' },
  ghost: { background: 'transparent', color: 'var(--color-text-secondary)', border: 'none' },
  danger: { background: 'var(--color-danger-light)', color: '#991B1B', border: 'none' },
  'amber-outline': { background: 'transparent', color: 'var(--color-amber)', border: '1.5px solid var(--color-amber)' },
};

const SIZES: Record<string, CSSProperties> = {
  xs: { padding: '3px 8px', fontSize: 11, height: 26, borderRadius: 'var(--radius-sm)' },
  sm: { padding: '5px 11px', fontSize: 12, height: 30, borderRadius: 'var(--radius-sm)' },
  md: { padding: '7px 14px', fontSize: 13, height: 36, borderRadius: 'var(--radius-md)' },
  lg: { padding: '10px 20px', fontSize: 14, height: 44, borderRadius: 'var(--radius-md)' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  fullWidth,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.01, boxShadow: variant === 'primary' ? 'var(--shadow-lg)' : undefined } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      whileFocus={!isDisabled ? { boxShadow: 'var(--shadow-focus)' } : undefined}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        ...(fullWidth ? { width: '100%' } : {}),
        ...(isDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 13,
            height: 13,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.65s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        <>
          {icon && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
          {children}
          {iconRight && <span style={{ display: 'flex', flexShrink: 0 }}>{iconRight}</span>}
        </>
      )}
    </motion.button>
  );
}
