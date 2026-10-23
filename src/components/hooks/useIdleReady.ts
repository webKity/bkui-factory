import { useEffect, useState } from "react";

export const useIdleReady = (timeout = 500) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as any;

    if ('requestIdleCallback' in win) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout });
      return () => win.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(() => setReady(true), timeout);
    return () => window.clearTimeout(timer);
  }, [timeout]);

  return ready;
};