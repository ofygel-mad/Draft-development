import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIStore {
  theme: Theme;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  dark ? root.setAttribute('data-theme', 'dark') : root.removeAttribute('data-theme');
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      focusMode: false,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    { name: 'crm-ui' },
  ),
);

if (typeof window !== 'undefined') {
  const raw = localStorage.getItem('crm-ui');
  const theme: Theme = raw ? (JSON.parse(raw).state?.theme ?? 'system') : 'system';
  applyTheme(theme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useUIStore.getState().theme === 'system') applyTheme('system');
  });
}
