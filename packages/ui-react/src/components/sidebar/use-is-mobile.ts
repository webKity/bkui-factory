import { useSyncExternalStore } from 'react';

// 与 styles.css 的 48rem 断点互补；每个 Window 复用一个 MediaQueryList。
const query = '(min-width: 48rem)';
const queries = new WeakMap<Window, MediaQueryList>();
function getMedia() {
  let media = queries.get(window);
  if (!media) {
    media = window.matchMedia(query);
    queries.set(window, media);
  }
  return media;
}
function subscribe(callback: () => void) {
  const media = getMedia();
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const getSnapshot = () => !getMedia().matches;
const getServerSnapshot = () => false;
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
