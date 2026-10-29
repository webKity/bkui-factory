'use client';

import { Dialog } from '@base-ui/react/dialog';
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../button';
import { BKIcon } from '../icon';
import { Gallery } from './Gallery';
import { resolveGalleryLabels } from './labels';

import type { ShowGalleryOptions } from './type';

interface GalleryEntry {
  container: HTMLElement;
  previousFocus: Element | null;
}

const closeIcon = <BKIcon name="close" size="100%" renderInServer />;
const openGalleries: GalleryEntry[] = [];

function unregisterGallery(entry: GalleryEntry) {
  const position = openGalleries.indexOf(entry);
  const wasTop = position === openGalleries.length - 1;

  // 提前关闭下层弹层时，将上层弹层的返回焦点接回仍存活的触发元素。
  for (const other of openGalleries) {
    const returnsToClosingGallery =
      other !== entry && other.previousFocus && entry.container.contains(other.previousFocus);

    if (returnsToClosingGallery) other.previousFocus = entry.previousFocus;
  }

  if (position !== -1) openGalleries.splice(position, 1);

  return wasTop;
}

/** 打开独立画廊弹层，可叠加；返回可重复安全调用的关闭函数。仅可在浏览器中调用。 */
export function showGallery(options: ShowGalleryOptions): () => void {
  if (typeof document === 'undefined') return () => {};

  const { closeLabel, onClose, ...props } = options;
  const labels = resolveGalleryLabels(props.labels);
  const container = document.createElement('div');
  const entry: GalleryEntry = { container, previousFocus: document.activeElement };
  const direction = entry.previousFocus && getComputedStyle(entry.previousFocus).direction;
  const closeButtonRef = createRef<HTMLButtonElement>();

  // Portal 保留触发位置的文字方向，不强制依赖 body 的方向。
  container.className = 'bkreact-gallery-root';
  container.dir = direction === 'rtl' ? 'rtl' : 'ltr';
  document.body.append(container);
  openGalleries.push(entry);

  const root = createRoot(container);
  let closed = false;

  function close() {
    if (closed) return;

    closed = true;

    // 避免在 React 的事件或提交阶段同步卸载另一个 root。
    queueMicrotask(() => {
      const wasTop = unregisterGallery(entry);

      try {
        root.unmount();
      } finally {
        container.remove();

        const { previousFocus } = entry;

        if (wasTop && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
          previousFocus.focus();
        }

        onClose?.();
      }
    });
  }

  root.render(
    <Dialog.Root
      defaultOpen
      onOpenChange={open => {
        if (!open) close();
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="bkreact-gallery bkreact-gallery__backdrop" />
        <Dialog.Popup
          className="bkreact-gallery bkreact-gallery__dialog"
          aria-label={labels.region}
          aria-describedby={undefined}
          initialFocus={closeButtonRef}
          finalFocus={false}
        >
          <Dialog.Close
            render={
              <Button
                ref={closeButtonRef}
                className="bkreact-gallery__close"
                shape="square"
                round
                aria-label={closeLabel ?? labels.close}
                prefixIcon={closeIcon}
              />
            }
          />
          <Gallery {...props} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>,
  );

  return close;
}
