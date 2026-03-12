import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '../layout/AppShell';
import { AuthShell } from '../layout/AuthShell';
import { PageLoader } from '../../shared/ui/PageLoader';
import { useAuthStore } from '../../shared/stores/auth';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';

const wrap = (imp: () => Promise<{ default: ComponentType }>) => {
  const Comp = lazy(imp);
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Comp />
      </Suspense>
    </ErrorBoundary>
  );
};

function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const org = useAuthStore((s) => s.org);
  const { pathname } = window.location;
  if (!token) return <Navigate to="/auth/login" replace />;
  if (org && !org.onboarding_completed && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth/login" replace />;
  if (role !== 'owner' && role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

const LoginPage = wrap(() => import('../../pages/auth/login'));
const RegisterPage = wrap(() => import('../../pages/auth/register'));
const AcceptInvite = wrap(() => import('../../pages/auth/accept-invite'));
const OnboardingPage = wrap(() => import('../../pages/onboarding'));
const DashboardPage = wrap(() => import('../../pages/dashboard'));
const CustomersPage = wrap(() => import('../../pages/customers'));
const CustomerProfile = wrap(() => import('../../pages/customers/profile'));
const DealsPage = wrap(() => import('../../pages/deals'));
const DealProfile = wrap(() => import('../../pages/deals/profile'));
const TasksPage = wrap(() => import('../../pages/tasks'));
const ReportsPage = wrap(() => import('../../pages/reports'));
const AutomationsPage = wrap(() => import('../../pages/automations'));
const ImportsPage = wrap(() => import('../../pages/imports'));
const SettingsPage = wrap(() => import('../../pages/settings'));
const AuditPage = wrap(() => import('../../pages/audit'));
const AdminPage = wrap(() => import('../../pages/admin'));
const FeedPage = wrap(() => import('../../pages/feed'));

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthShell />,
    children: [
      { path: 'login', element: LoginPage },
      { path: 'register', element: RegisterPage },
      { path: 'accept-invite', element: AcceptInvite },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: OnboardingPage },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [
          { index: true, element: AdminPage },
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
          { index: true, element: DashboardPage },
          { path: 'customers', element: CustomersPage },
          { path: 'customers/:id', element: CustomerProfile },
          { path: 'deals', element: DealsPage },
          { path: 'deals/:id', element: DealProfile },
          { path: 'feed', element: FeedPage },
          { path: 'tasks', element: TasksPage },
          { path: 'reports', element: ReportsPage },
          { path: 'automations', element: AutomationsPage },
          { path: 'imports', element: ImportsPage },
          { path: 'audit', element: AuditPage },
          { path: 'settings', element: SettingsPage },
          { path: 'settings/:section', element: SettingsPage },
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
