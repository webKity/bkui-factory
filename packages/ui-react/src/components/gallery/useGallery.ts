import { useCallback, useEffect, useRef, useState } from 'react';

import type { AnimationEvent, KeyboardEvent } from 'react';
import type { GalleryItem, GalleryProps } from './type';

type GalleryStateOptions = Pick<
  GalleryProps,
  'items' | 'index' | 'defaultIndex' | 'loop' | 'onIndexChange'
>;

interface NavigationRequest {
  from: number;
  index: number;
  direction: number;
  revision: number;
}

interface GalleryMotion {
  key: string;
  index: number;
  item: GalleryItem | undefined;
  outgoing: GalleryItem | undefined;
  direction: number;
  revision: number;
}

const ANIMATION_NAME = 'bk-gallery-enter';
const ANIMATION_TIMEOUT_BUFFER = 50;
const EDITABLE_SELECTOR = 'video, input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function normalizeIndex(index: number, length: number) {
  const integer = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(integer, length - 1));
}

function getTransitionDirection(
  previous: GalleryMotion,
  nextIndex: number,
  total: number,
  loop: boolean,
  request: NavigationRequest | null,
) {
  const matchesRequest = request?.revision === previous.revision
    && request.from === previous.index
    && request.index === nextIndex;

  if (matchesRequest) return request.direction;

  // 外部受控跳转：循环模式走最短方向，等距时按索引大小。
  const delta = nextIndex - previous.index;
  const direction = Math.sign(delta) || 1;
  return loop && Math.abs(delta) > total / 2 ? -direction : direction;
}

function toMilliseconds(value: string) {
  const multiplier = value.trim().endsWith('ms') ? 1 : 1000;
  return (parseFloat(value) || 0) * multiplier;
}

function getAnimationDuration(element: HTMLElement) {
  const style = getComputedStyle(element);
  const names = style.animationName.split(',').map(name => name.trim());
  const durations = style.animationDuration.split(',').map(toMilliseconds);
  const delays = style.animationDelay.split(',').map(toMilliseconds);
  const endTimes = names.map((name, i) => {
    if (!name || name === 'none') return 0;
    return durations[i % durations.length] + delays[i % delays.length];
  });

  return Math.max(0, ...endTimes);
}

export function useGallery({
  items,
  index,
  defaultIndex = 0,
  loop = false,
  onIndexChange,
}: GalleryStateOptions) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const [navigation, setNavigation] = useState<NavigationRequest | null>(null);
  const activeIndex = normalizeIndex(index ?? internalIndex, items.length);
  const item: GalleryItem | undefined = items[activeIndex];
  const mediaKey = item ? `${activeIndex}:${item.type}:${item.src}` : 'empty';
  const slideRef = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<GalleryMotion>({
    key: mediaKey,
    index: activeIndex,
    item,
    outgoing: undefined,
    direction: 1,
    revision: 0,
  });

  // 同步保存上一项，避免在 effect 中更新导致新媒体先无动画地显示一帧。
  if (motion.key !== mediaKey) {
    setMotion({
      key: mediaKey,
      index: activeIndex,
      item,
      outgoing: item ? motion.item : undefined,
      direction: getTransitionDirection(motion, activeIndex, items.length, loop, navigation),
      revision: motion.revision + 1,
    });
  }

  const finishTransition = useCallback((revision: number) => {
    setMotion(current => {
      if (current.revision !== revision || !current.outgoing) return current;
      return { ...current, outgoing: undefined };
    });
  }, []);

  useEffect(() => {
    if (!motion.outgoing || !slideRef.current) return;

    const duration = getAnimationDuration(slideRef.current);
    const finish = () => finishTransition(motion.revision);

    // 动画被禁用时立即清理；计时器兜底处理未派发 animationend 的情况。
    if (!duration) {
      finish();
      return;
    }

    const timer = setTimeout(finish, duration + ANIMATION_TIMEOUT_BUFFER);
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (preference?.matches) finish();
    };

    onPreferenceChange();
    preference?.addEventListener('change', onPreferenceChange);

    return () => {
      clearTimeout(timer);
      preference?.removeEventListener('change', onPreferenceChange);
    };
  }, [motion.revision, motion.outgoing, finishTransition]);

  function select(next: number) {
    const normalized = loop && items.length
      ? (next % items.length + items.length) % items.length
      : normalizeIndex(next, items.length);
    const nextItem = items[normalized];

    if (!nextItem || normalized === activeIndex) return;

    setNavigation({
      from: activeIndex,
      index: normalized,
      direction: next > activeIndex ? 1 : -1,
      revision: motion.revision,
    });
    if (index === undefined) setInternalIndex(normalized);
    onIndexChange?.(normalized, nextItem);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    // 保留视频和可编辑元素的原生键盘操作。
    const element = event.target;
    if (!(element instanceof Element) || element.closest(EDITABLE_SELECTOR)) return;

    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const step = rtl ? -1 : 1;
    const targets: Record<string, number> = {
      ArrowLeft: activeIndex - step,
      ArrowRight: activeIndex + step,
      Home: 0,
      End: items.length - 1,
    };
    const target = targets[event.key];

    if (target === undefined || items.length < 2) return;

    event.preventDefault();
    select(target);
  }

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.animationName !== ANIMATION_NAME) return;
    finishTransition(motion.revision);
  }

  return { activeIndex, item, mediaKey, motion, slideRef, select, onKeyDown, onAnimationEnd };
}
