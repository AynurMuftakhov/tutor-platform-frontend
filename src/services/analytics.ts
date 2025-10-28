interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
  ts: string;
}

const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '';

const sendBeacon = (url: string, event: AnalyticsEvent) => {
  try {
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, blob);
      return true;
    }
  } catch (_) {
    // noop
  }
  return false;
};

export const trackAnalyticsEvent = (name: string, payload?: Record<string, unknown>) => {
  const event: AnalyticsEvent = {
    name,
    payload,
    ts: new Date().toISOString(),
  };

  if (!ANALYTICS_ENDPOINT) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', event);
    }
    return;
  }

  if (!sendBeacon(ANALYTICS_ENDPOINT, event)) {
    void fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      // fail silently to avoid blocking UX
    });
  }
};
