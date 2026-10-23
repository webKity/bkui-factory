'use client';

import { useEffect, useState } from 'react';

/** Keeps the server and first client render consistent, then renders during idle time. */
export function useIdleReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function' && typeof window.cancelIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}
