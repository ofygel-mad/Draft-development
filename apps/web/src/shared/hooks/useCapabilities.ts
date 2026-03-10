import { useAuthStore } from '../stores/auth';

export function useCapabilities() {
  const capabilities = useAuthStore(s => s.capabilities);
  const mode = useAuthStore(s => s.org?.mode ?? 'basic');

  return {
    can: (cap: string) => capabilities.includes(cap),
    mode,
    isBasic: mode === 'basic',
    isAdvanced: mode === 'advanced',
    isIndustrial: mode === 'industrial',
  };
}
