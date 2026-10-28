'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Button } from '../button';
import { BKIcon } from '../icon';

import type { CSSProperties } from 'react';
import type { IconName } from '../icon';
import type { IBKIntent } from '../types/base';
import type { NotificationProps } from './type';
import './index.css';

// normal 与 brand 共用信息图标，通过意图颜色区分。
const intentIcons = {
  normal: 'info-circle',
  brand: 'info-circle',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'xmark-circle',
} satisfies Record<IBKIntent, IconName>;

type CountdownStyle = CSSProperties & {
  '--notification-countdown-duration': string;
  '--notification-countdown-delay': string;
};

/** 受控通知卡片；列表、位置和自动关闭由 NotificationProvider 管理。 */
export function Notification({ item, onClose, onRemoved }: NotificationProps) {
  const element = useRef<HTMLDivElement>(null);
  const removedRef = useRef(onRemoved);
  useEffect(() => { removedRef.current = onRemoved; }, [onRemoved]);

  useEffect(() => {
    if (!item.closing || !element.current) return;
    // 以最终 CSS 为准，兼容主题覆盖、关闭动画及减少动态效果。
    const style = getComputedStyle(element.current);
    const toMs = (value: string) => (parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);
    const durations = style.animationDuration.split(',').map(toMs);
    const delays = style.animationDelay.split(',').map(toMs);
    const duration = style.animationName === 'none' ? 0 : Math.max(0, ...durations.map((value, index) => value + delays[index % delays.length]));
    // 退场完成只通知移除；onClose 始终表示用户请求开始关闭。
    const timer = setTimeout(() => removedRef.current?.(item.id), duration);
    return () => clearTimeout(timer);
  }, [item.closing, item.id]);

  const intent = item.intent ?? 'normal';
  const progressStyle = useMemo<CountdownStyle | undefined>(() => {
    if (!Number.isFinite(item.duration) || !item.duration || item.duration <= 0) return undefined;
    // 初次挂载时补偿排队时间；后续通知引起的重渲染不会重置倒计时。
    // id 标识新通知实例，即使时长与截止时间相同也重新计算。
    const elapsed = item.expiresAt == null ? 0 : Math.min(item.duration, Math.max(0, Date.now() - (item.expiresAt - item.duration)));
    return {
      '--notification-countdown-duration': `${item.duration}ms`,
      '--notification-countdown-delay': `${-elapsed}ms`,
    };
  }, [item.id, item.duration, item.expiresAt]);
  return (
    <div ref={element} className="bkreact-notification" role={intent === 'danger' ? 'alert' : 'status'}
      aria-atomic="true" data-intent={intent} data-state={item.closing ? 'closing' : 'open'}>
      {progressStyle && <div className="bkreact-notification__progress" aria-hidden="true">
        <span className="bkreact-notification__progress-fill" style={progressStyle} />
      </div>}
      <span className="bkreact-notification__icon" aria-hidden="true">
        <BKIcon name={intentIcons[intent]} size="100%" renderInServer />
      </span>
      <div className="bkreact-notification__content">
        {item.title != null && <div className="bkreact-notification__title">{item.title}</div>}
        {item.message != null && <div className="bkreact-notification__message">{item.message}</div>}
        {item.children != null && <div className="bkreact-notification__body">{item.children}</div>}
      </div>
      <Button
        className="bkreact-notification__close"
        size="sm"
        shape="square"
        variant="ghost"
        aria-label={item.closeLabel ?? 'Close notification'}
        disabled={item.closing}
        prefixIcon={<BKIcon name="close" size="100%" renderInServer />}
        onClick={() => onClose(item.id)}
      />
      {!!item.actions?.length && <div className="bkreact-notification__actions">
        {item.actions.map((action, index) => (
          <Button key={index} size="sm" intent={action.intent ?? intent} variant={action.variant ?? 'ghost'}
            disabled={item.closing} onClick={action.onClick}>{action.label}</Button>
        ))}
      </div>}
    </div>
  );
}

export default Notification;
