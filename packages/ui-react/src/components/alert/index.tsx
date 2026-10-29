'use client';

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAlertSizeStyle } from './size';
import { BKIcon } from '../icon';
import { getResponsiveSizeAttributes } from '../utils/size';
import type { RefCallback } from 'react';
import type { IAlertProps } from './type';
import './index.css';

export type { IAlertProps } from './type';

export const Alert = forwardRef<HTMLDivElement, IAlertProps>(function Alert(
  {
    message,
    intent = 'normal',
    size = 'base',
    className,
    contentClassName,
    prefixIcon,
    suffixIcon,
    description,
    action,
    closable = false,
    onClose,
  },
  ref,
) {
  const [state, setState] = useState<'open' | 'closing' | 'closed'>('open');
  const elementRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // 只在提交后更新，确保关闭回调读取最新已提交的 props。
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node;
      if (typeof ref === 'function') {
        const cleanup = (ref as RefCallback<HTMLDivElement>)(node);
        // 保留 React 19 回调 ref 的清理语义。
        if (typeof cleanup === 'function') {
          return () => {
            elementRef.current = null;
            cleanup();
          };
        }
      } else if (ref) ref.current = node;
    },
    [ref],
  );

  const finishClose = useCallback(() => {
    if (closedRef.current) return;

    closedRef.current = true;
    setState('closed');
    onCloseRef.current?.();
  }, []);

  useEffect(() => {
    if (state !== 'closing' || !elementRef.current) return;

    // 读取最终动画时长，兼容 token 覆盖、减少动态效果及动画被禁用的场景。
    const style = getComputedStyle(elementRef.current);

    const toMs = (value: string) =>
      (parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);

    const durations = style.animationDuration.split(',').map(toMs);
    const delays = style.animationDelay.split(',').map(toMs);
    const names = style.animationName.split(',').map(name => name.trim());
    const index = names.indexOf('bk-alert-close');
    // CSS 列表按动画名称循环匹配；装饰动画不参与关闭等待。
    const duration =
      index === -1
        ? 0
        : Math.max(0, durations[index % durations.length] + delays[index % delays.length]);
    // animationend 未送达时按关闭动画的时长兜底；动画禁用时直接关闭。
    const timer = setTimeout(finishClose, duration);

    return () => clearTimeout(timer);
  }, [state, finishClose]);

  if (state === 'closed') return null;

  return (
    <div
      {...getResponsiveSizeAttributes(size)}
      ref={setRefs}
      role="alert"
      className={['bkreact-alert', className].filter(Boolean).join(' ')}
      style={getAlertSizeStyle(size)}
      data-intent={intent}
      data-size={typeof size === 'string' ? size : 'responsive'}
      data-state={state}
      onAnimationEnd={event => {
        if (
          state === 'closing' &&
          event.target === event.currentTarget &&
          event.animationName === 'bk-alert-close'
        ) {
          finishClose();
        }
      }}
    >
      {prefixIcon != null && typeof prefixIcon !== 'boolean' && (
        <span className="bkreact-alert__icon" aria-hidden="true">
          {prefixIcon}
        </span>
      )}
      <div className={['bkreact-alert__content', contentClassName].filter(Boolean).join(' ')}>
        <div className="bkreact-alert__message">{message}</div>
        {description && <div className="bkreact-alert__description">{description}</div>}
      </div>
      {action != null && typeof action !== 'boolean' && (
        <div className="bkreact-alert__action">{action}</div>
      )}
      {suffixIcon != null && typeof suffixIcon !== 'boolean' && (
        <span className="bkreact-alert__icon" aria-hidden="true">
          {suffixIcon}
        </span>
      )}
      {closable && (
        <button
          type="button"
          className="bkreact-alert__close"
          aria-label={`关闭提示：${message}`}
          disabled={state === 'closing'}
          onClick={() => setState('closing')}
        >
          <BKIcon name="close" size="100%" renderInServer />
        </button>
      )}
    </div>
  );
});

export default Alert;
