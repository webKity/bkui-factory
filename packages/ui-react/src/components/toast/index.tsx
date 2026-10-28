'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BKIcon } from '../icon';
import type { IconName } from '../icon';
import type { IBKIntent } from '../types/base';
import type { ToastProps } from './type';
import './index.css';

export type { ToastConfigType, ToastProps } from './type';
export { showToast } from './showToast';

const intentIcons = {
  normal: 'info-circle',
  brand: 'info-circle',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'xmark-circle',
} satisfies Record<IBKIntent, IconName>;

/** 顶部居中的轻提示；visible 从 false 切换至 true 时重新开始显示。 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast({
  intent = 'normal', msg, icon, duration = 3000, className, onClose, visible = true,
}, ref) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setDismissed(false);
    if (!visible || !Number.isFinite(duration) || duration <= 0) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      onCloseRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, msg]);

  if (!mounted || !visible || dismissed) return null;
  return createPortal(
    <div className="bkreact-toast-viewport">
      <div ref={ref} className={['bkreact-toast', className].filter(Boolean).join(' ')}
        data-intent={intent} role={intent === 'danger' ? 'alert' : 'status'} aria-atomic="true">
        {icon !== null && <span className="bkreact-toast__icon" aria-hidden="true">
          {icon ?? <BKIcon name={intentIcons[intent]} size="100%" renderInServer />}
        </span>}
        <span className="bkreact-toast__message">{msg}</span>
      </div>
    </div>, document.body,
  );
});

export default Toast;
