import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

const variants: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--color-amber)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' },
  ghost: { background: 'transparent', color: 'var(--color-text-secondary)', border: 'none' },
  danger: { background: '#FEE2E2', color: '#991B1B', border: 'none' },
};

const sizes: Record<string, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: 12, height: 30, borderRadius: 'var(--radius-sm)' },
  md: { padding: '7px 14px', fontSize: 13, height: 36, borderRadius: 'var(--radius-md)' },
};

export function Button({ variant = 'primary', size = 'md', icon, loading, children, style, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontWeight: 500, fontFamily: 'var(--font-body)',
        ...variants[variant],
        ...sizes[size],
        ...(disabled || loading ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        : <>{icon && <span style={{ display: 'flex' }}>{icon}</span>}{children}</>
      }
    </motion.button>
  );
}
