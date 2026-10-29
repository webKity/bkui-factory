'use client';

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup, PopupContent } from './base';
import type { Dialog } from '@base-ui/react/dialog';
import type { ReactElement, ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import type { CreatePopupProps, PopupInstanceHandle } from './type';

function createEntry(props: CreatePopupProps, remove: () => void) {
  let open = true;
  let destroyed = false;
  const listeners = new Set<() => void>();
  // 内外部共用同一个 ref，由 Dialog.Root 负责赋值与卸载清理。
  const rootActionsRef = props.actionsRef ?? { current: null as Dialog.Root.Actions | null };
  const publish = (value: boolean) => {
    if (destroyed) return;
    open = value;
    listeners.forEach(listener => listener());
  };
  const handle: PopupInstanceHandle = {
    open: () => publish(true),
    close: () => {
      if (destroyed) return;
      // 尚未提交时直接移除，避免 close 后首次渲染又打开。
      if (!rootActionsRef.current) handle.destroy();
      else rootActionsRef.current.close();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      remove();
    },
  };
  function Instance() {
    const visible = useSyncExternalStore(
      useCallback(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, []),
      () => open,
      () => false,
    );
    const { onOpenChange, onOpenChangeComplete, modal, disablePointerDismissal, actionsRef: _actionsRef,
      handle: dialogHandle, triggerId, defaultTriggerId, ...contentProps } = props;
    return <Popup open={visible} modal={modal} disablePointerDismissal={disablePointerDismissal}
      handle={dialogHandle} triggerId={triggerId} defaultTriggerId={defaultTriggerId}
      actionsRef={rootActionsRef}
      onOpenChange={(next, details) => {
        onOpenChange?.(next, details);
        if (!details.isCanceled) publish(next);
      }}
      onOpenChangeComplete={next => {
        try { onOpenChangeComplete?.(next); }
        finally { if (!next && !open) handle.destroy(); }
      }}>
      <PopupContent {...contentProps} />
    </Popup>;
  }
  return { handle, element: <Instance /> };
}

type HolderHandle = { replace: (element: ReactElement) => () => void };
const Holder = forwardRef<HolderHandle>(function Holder(_, ref) {
  const [element, setElement] = useState<ReactElement | null>(null);
  useImperativeHandle(ref, () => ({ replace(next) {
    setElement(next);
    return () => setElement(current => current === next ? null : current);
  } }), []);
  return element;
});

/**
 * 将 holder 渲染在需要继承的 Context Provider 内。
 * 每次 create 会立即销毁该 holder 的旧弹层；需要叠加时使用多个 usePopup holder。
 */
export function usePopup() {
  const holder = useRef<HolderHandle>(null);
  const current = useRef<PopupInstanceHandle | null>(null);
  useEffect(() => () => { current.current?.destroy(); current.current = null; }, []);
  const create = useCallback((props: CreatePopupProps) => {
    if (!holder.current) throw new Error('Render the usePopup holder before creating a popup');
    current.current?.destroy();
    let remove = () => {};
    const entry = createEntry(props, () => remove());
    remove = holder.current.replace(entry.element);
    current.current = entry.handle;
    return entry.handle;
  }, []);
  return [create, <Holder key="popup-holder" ref={holder} />] as const;
}

// root.render 通常异步执行，外层 try/catch 无法捕获后续的渲染异常。
// 清理资源后继续抛出，保留 React 原本的错误上报行为；兼容 React 18/19。
class PopupErrorBoundary extends Component<{
  children: ReactNode;
  onError: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError();
    throw error;
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** 独立 React root；需要继承应用 Context 时使用 usePopup。 */
export function popup(props: CreatePopupProps): PopupInstanceHandle {
  if (typeof document === 'undefined') throw new Error('popup can only be used in the browser');
  const container = document.createElement('div');
  let root: Root | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { root?.unmount(); }
    finally { container.remove(); }
  };
  const entry = createEntry(props, () => {
    // 错误边界、事件及关闭完成回调都可能位于 React 的提交阶段。
    queueMicrotask(dispose);
  });

  document.body.append(container);
  try {
    root = createRoot(container);
    root.render(
      <PopupErrorBoundary onError={entry.handle.destroy}>
        {entry.element}
      </PopupErrorBoundary>,
    );
  } catch (error) {
    entry.handle.destroy();
    dispose();
    throw error;
  }
  return entry.handle;
}
