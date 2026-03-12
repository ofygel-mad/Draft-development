import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '../layout/AppShell';
import { AuthShell } from '../layout/AuthShell';
import { PageLoader } from '../../shared/ui/PageLoader';
import { useAuthStore } from '../../shared/stores/auth';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';

function makePage(imp: () => Promise<{ default: ComponentType }>) {
  const Comp = lazy(imp);
  return function LazyPage() {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Comp />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

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

const LoginPage = makePage(() => import('../../pages/auth/login'));
const RegisterPage = makePage(() => import('../../pages/auth/register'));
const AcceptInvite = makePage(() => import('../../pages/auth/accept-invite'));
const OnboardingPage = makePage(() => import('../../pages/onboarding'));
const DashboardPage = makePage(() => import('../../pages/dashboard'));
const CustomersPage = makePage(() => import('../../pages/customers'));
const CustomerProfile = makePage(() => import('../../pages/customers/profile'));
const DealsPage = makePage(() => import('../../pages/deals'));
const DealProfile = makePage(() => import('../../pages/deals/profile'));
const TasksPage = makePage(() => import('../../pages/tasks'));
const ReportsPage = makePage(() => import('../../pages/reports'));
const AutomationsPage = makePage(() => import('../../pages/automations'));
const ImportsPage = makePage(() => import('../../pages/imports'));
const SettingsPage = makePage(() => import('../../pages/settings'));
const AuditPage = makePage(() => import('../../pages/audit'));
const AdminPage = makePage(() => import('../../pages/admin'));
const FeedPage = makePage(() => import('../../pages/feed'));

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
