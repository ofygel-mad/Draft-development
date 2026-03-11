import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, Component, type ComponentType, type ReactNode } from 'react';
import { AppShell } from '../layout/AppShell';
import { AuthShell } from '../layout/AuthShell';
import { PageLoader } from '../../shared/ui/PageLoader';
import { useAuthStore } from '../../shared/stores/auth';

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Что-то пошло не так
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 360, textAlign: 'center' }}>
          {this.state.message}
        </div>
        <button
          onClick={() => {
            this.setState({ hasError: false, message: '' });
            window.location.href = '/';
          }}
          style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          На главную
        </button>
      </div>
    );
  }
}

const wrap = (imp: () => Promise<{ default: ComponentType }>) => {
  const Comp = lazy(imp);
  return (
    <Suspense fallback={<PageLoader />}>
      <Comp />
    </Suspense>
  );
};

function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth/login" replace />;
  if (role !== 'owner' && role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

const LoginPage = () => wrap(() => import('../../pages/auth/login'));
const RegisterPage = () => wrap(() => import('../../pages/auth/register'));
const AcceptInvite = () => wrap(() => import('../../pages/auth/accept-invite'));
const OnboardingPage = () => wrap(() => import('../../pages/onboarding'));
const DashboardPage = () => wrap(() => import('../../pages/dashboard'));
const CustomersPage = () => wrap(() => import('../../pages/customers'));
const CustomerProfile = () => wrap(() => import('../../pages/customers/profile'));
const DealsPage = () => wrap(() => import('../../pages/deals'));
const DealProfile = () => wrap(() => import('../../pages/deals/profile'));
const TasksPage = () => wrap(() => import('../../pages/tasks'));
const ReportsPage = () => wrap(() => import('../../pages/reports'));
const AutomationsPage = () => wrap(() => import('../../pages/automations'));
const ImportsPage = () => wrap(() => import('../../pages/imports'));
const SettingsPage = () => wrap(() => import('../../pages/settings'));
const AuditPage = () => wrap(() => import('../../pages/audit'));
const AdminPage = () => wrap(() => import('../../pages/admin'));
const FeedPage = () => wrap(() => import('../../pages/feed'));

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthShell />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'accept-invite', element: <AcceptInvite /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [
          { index: true, element: <AdminPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:id', element: <CustomerProfile /> },
          { path: 'deals', element: <DealsPage /> },
          { path: 'deals/:id', element: <DealProfile /> },
          { path: 'feed', element: <FeedPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'automations', element: <AutomationsPage /> },
          { path: 'imports', element: <ImportsPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/:section', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
