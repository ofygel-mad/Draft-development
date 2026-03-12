import type { AnalyticsEventName, AnalyticsPayload } from './events';

export function track(event: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  if (import.meta.env.DEV) {
    console.info('[analytics]', event, payload);
  }

  window.dispatchEvent(
    new CustomEvent('crm:analytics', {
      detail: { event, payload, ts: new Date().toISOString() },
    }),
  );
}
