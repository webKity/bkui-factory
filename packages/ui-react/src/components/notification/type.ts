import type { ReactNode } from 'react';
import type { IBKVariants, IBKIntent } from '../types/base';

export type NotificationInput = {
  className?: string;
  message?: string;
  title?: string;
  children?: ReactNode;
  intent?: IBKIntent;
  position?: NotificationPosition;
  actions?: NotificationAction[];
  /** 关闭按钮的无障碍标签，默认 'Close notification'。 */
  closeLabel?: string;
  /** 自动关闭时间（毫秒），默认 DEFAULT_NOTIFICATION_DURATION；非有限正数时保持显示。 */
  duration?: number;
};

export type NotificationContextValue = {
  showNotification: (input: NotificationInput) => string;
  closeNotification: (id: string) => void;
};

export type NotificationAction = {
  label: string;
  intent?: IBKIntent;
  variant?: IBKVariants;
  onClick?: () => void;
};

export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type NotificationItem = NotificationInput & {
  id: string;
  /** 自动关闭的时间戳，用于使进度条与关闭定时器同步。 */
  expiresAt?: number;
  closing?: boolean;
};

export type NotificationProps = {
  className?: string;
  item: NotificationItem;
  /** 用户请求关闭，开始退场。 */
  onClose: (id: string) => void;
  /** 退场完成，可从列表中移除。 */
  onRemoved?: (id: string) => void;
};

export type NotificationProviderProps = {
  /** Applied to each notification viewport. */
  className?: string;
  children?: ReactNode;
};
