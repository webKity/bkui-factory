'use client';

import { Dialog } from '@base-ui/react/dialog';
import { createRoot } from 'react-dom/client';
import { Button } from '../button';
import { BKIcon } from '../icon';
import { Gallery } from './index';
import type { ShowGalleryOptions } from './type';

const closeIcon = <BKIcon name="close" size="100%" renderInServer />;

/** 打开独立画廊弹层；返回可重复安全调用的关闭函数。仅可在浏览器中调用。 */
export function showGallery(options: ShowGalleryOptions): () => void {
  if (typeof document === 'undefined') return () => {};
  const { closeLabel = 'Close gallery', onClose, ...props } = options;
  const previousFocus = document.activeElement;
  const container = document.createElement('div');
  container.className = 'bkreact-gallery-root';
  document.body.append(container);
  const root = createRoot(container);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    // 避免在 React 的事件或提交阶段同步卸载另一个 root。
    queueMicrotask(() => {
      root.unmount();
      container.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      onClose?.();
    });
  }
  root.render(
    <Dialog.Root defaultOpen onOpenChange={open => { if (!open) close(); }}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="bkreact-gallery bkreact-gallery__backdrop" />
        <Dialog.Popup className="bkreact-gallery bkreact-gallery__dialog" aria-label="Media gallery" aria-describedby={undefined}>
          <Dialog.Close render={<Button className="bkreact-gallery__close" shape="square" round aria-label={closeLabel} prefixIcon={closeIcon} />} />
          <Gallery {...props} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>,
  );
  return close;
}
