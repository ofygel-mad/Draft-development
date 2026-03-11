import { useAuthStore } from '../stores/auth';

type Role = 'owner' | 'admin' | 'manager' | 'viewer';

export function useRole() {
  const role = (useAuthStore((s) => s.role) ?? 'viewer') as Role;

  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';
  const isManager = isAdmin || role === 'manager';
  const isViewer = role === 'viewer';

  return { role, isOwner, isAdmin, isManager, isViewer };
}
