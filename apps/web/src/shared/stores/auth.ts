import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = { id: string; full_name: string; email: string; avatar_url?: string };
type Org = { id: string; name: string; mode: 'basic' | 'advanced' | 'industrial'; slug: string };

type AuthState = {
  user: User | null;
  org: Org | null;
  token: string | null;
  role: string;
  capabilities: string[];
  setAuth: (user: User, org: Org, token: string, caps: string[], role?: string) => void;
  setRole: (role: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      token: null,
      role: 'viewer',
      capabilities: [],
      setAuth: (user, org, token, capabilities, role = 'viewer') => set({ user, org, token, capabilities, role }),
      setRole: (role) => set({ role }),
      clearAuth: () => set({ user: null, org: null, token: null, role: 'viewer', capabilities: [] }),
    }),
    { name: 'crm-auth' },
  ),
);
