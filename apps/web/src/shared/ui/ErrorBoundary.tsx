import * as Sentry from '@sentry/react';
import { Component, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[CRM ErrorBoundary]', error, info.componentStack);
    Sentry.captureException(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Что-то пошло не так
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            maxWidth: 360,
            fontFamily: 'var(--font-mono)',
            background: 'var(--color-bg-muted)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            wordBreak: 'break-word',
          }}
        >
          {this.state.error?.message}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.href = '/';
          }}
        >
          На главную
        </Button>
      </div>
    );
  }
}
