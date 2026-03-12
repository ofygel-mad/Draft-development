import { useEffect, useState } from 'react';

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setPromptEvent(event); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);
  return { canInstall: Boolean(promptEvent), async install() { if (!promptEvent) return false; await promptEvent.prompt(); setPromptEvent(null); return true; } };
}
