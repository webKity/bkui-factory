'use client';

import { createRoot } from 'react-dom/client';
import { Toast } from './index';
import type { ToastConfigType } from './type';

let activeClose: (() => void) | undefined;

/** 显示轻提示并返回关闭函数；连续调用时替换上一条，关闭回调只触发一次。 */
export function showToast(config: ToastConfigType): () => void {
  if (typeof document === 'undefined') return () => {};

  activeClose?.();

  const container = document.createElement('div');
  container.className = 'bkreact-toast-root';
  document.body.append(container);
  const root = createRoot(container);
  let closed = false;
  function close() {
    if (closed) return;

    closed = true;

    if (activeClose === close) activeClose = undefined;

    // 自动关闭可能发生在 React 更新中，延后卸载独立 root。
    queueMicrotask(() => {
      root.unmount();
      container.remove();
      config.onClose?.();
    });
  }

  activeClose = close;
  root.render(<Toast {...config} onClose={close} />);

  return close;
}
