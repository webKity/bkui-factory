'use client';

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { getAlertSizeStyle } from './size';
import { getResponsiveSizeAttributes } from '../utils/size';
import type { IAlertProps } from './type';
import './index.css';

export type { IAlertProps } from './type';

export const Alert = forwardRef<HTMLDivElement, IAlertProps>(function Alert({
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
}, ref) {
  const [state, setState] = useState<'open' | 'closing' | 'closed'>('open');
  const elementRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

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
    const toMs = (value: string) => (parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);
    const durations = style.animationDuration.split(',').map(toMs);
    const delays = style.animationDelay.split(',').map(toMs);
    const duration = style.animationName === 'none' ? 0 : Math.max(0, ...durations.map((value, index) => value + delays[index % delays.length]));
    const timer = setTimeout(finishClose, duration);
    return () => clearTimeout(timer);
  }, [state, finishClose]);

  if (state === 'closed') return null;

  return (
    <div
      ref={node => {
        elementRef.current = node;
        if (typeof ref === 'function') return ref(node);
        if (ref) ref.current = node;
      }}
      role="alert"
      className={['bkreact-alert', className].filter(Boolean).join(' ')}
      style={getAlertSizeStyle(size)}
      {...getResponsiveSizeAttributes(size)}
      data-intent={intent}
      data-size={typeof size === 'string' ? size : 'responsive'}
      data-state={state}
      onAnimationEnd={event => {
        if (state === 'closing' && event.target === event.currentTarget && event.animationName === 'bk-alert-close') finishClose();
      }}
    >
      {prefixIcon != null && <span className="bkreact-alert__icon" aria-hidden="true">{prefixIcon}</span>}
      <div className={['bkreact-alert__content', contentClassName].filter(Boolean).join(' ')}>
        <div className="bkreact-alert__message">{message}</div>
        {description && <div className="bkreact-alert__description">{description}</div>}
      </div>
      {action != null && <div className="bkreact-alert__action">{action}</div>}
      {suffixIcon != null && <span className="bkreact-alert__icon" aria-hidden="true">{suffixIcon}</span>}
      {closable && (
        <button type="button" className="bkreact-alert__close" aria-label="关闭提示" disabled={state === 'closing'} onClick={() => setState('closing')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
        </button>
      )}
    </div>
  );
});

export default Alert;
