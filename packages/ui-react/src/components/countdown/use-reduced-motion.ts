import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const listeners = new Set<() => void>();
let media: MediaQueryList | null = null;

function getMedia() {
  if (!media && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    media = window.matchMedia(query);
  }
  return media;
}
const getSnapshot = () => getMedia()?.matches ?? false;
const getServerSnapshot = () => false;
const notifyAll = () => { for (const notify of listeners) notify(); };
const subscribe = (notify: () => void) => {
  const current = getMedia();
  if (!current) return () => {};
  listeners.add(notify);
  if (listeners.size === 1) current.addEventListener('change', notifyAll);
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      current.removeEventListener('change', notifyAll);
      media = null;
    }
  };
};

/** 所有数字共享一个媒体查询和浏览器监听；最后一个订阅卸载时释放，SSR 快照固定。 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
