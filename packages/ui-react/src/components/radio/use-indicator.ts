import { useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** 读取 Base UI 的实际选中项，非受控与受控模式共用同一状态源。 */
export function useRadioIndicator(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [geometry, setGeometry] = useState<CSSProperties | null>(null);

  useIsomorphicLayoutEffect(() => {
    const group = ref.current;
    if (!group || !enabled) {
      setGeometry(null);
      return;
    }
    const measure = () => {
      const selected = group.querySelector<HTMLElement>('.bkreact-radio__item[data-checked]');
      if (!selected) {
        setGeometry(null);
        return;
      }
      const parent = group.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      const next = {
        width: item.width,
        height: item.height,
        transform: `translate(${item.left - parent.left + group.scrollLeft - group.clientLeft}px, ${item.top - parent.top + group.scrollTop - group.clientTop}px)`,
      };
      setGeometry(previous => previous?.width === next.width && previous?.height === next.height && previous?.transform === next.transform ? previous : next);
    };
    let frame: number | undefined;
    // 高频 resize / DOM 更新合并到同一帧，初次定位仍在 layout effect 中完成。
    const scheduleMeasure = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleMeasure);
    const observedItems = new Set<Element>();
    const syncItems = () => {
      const items = new Set(Array.from(group.querySelectorAll('.bkreact-radio__item')));
      for (const item of observedItems) {
        if (!items.has(item)) {
          resize?.unobserve(item);
          observedItems.delete(item);
        }
      }
      for (const item of items) {
        if (!observedItems.has(item)) {
          resize?.observe(item);
          observedItems.add(item);
        }
      }
    };
    resize?.observe(group);
    syncItems();
    const mutation = new MutationObserver(records => {
      // 滑块自己的 style 更新不触发新一轮测量。
      const relevant = records.filter(record => !(record.target instanceof Element && record.target.closest('.bkreact-radio__slider')));
      if (!relevant.length) return;
      if (relevant.some(record => record.type === 'childList')) syncItems();
      scheduleMeasure();
    });
    mutation.observe(group, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-checked', 'class', 'style', 'dir', 'hidden'],
    });
    window.addEventListener('resize', scheduleMeasure);
    measure();
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [ref, enabled]);

  return geometry;
}
