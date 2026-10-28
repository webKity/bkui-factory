import type { ReactNode } from 'react';
import type { IBKVariants, IBKIntent } from '../types/base';

export type NotificationInput = {
  message?: string;
  title?: string;
  children?: ReactNode;
  intent?: IBKIntent;
  position?: NotificationPosition;
  actions?: NotificationItem['actions'];
  /** 自动关闭时间（毫秒），默认 4500；小于等于 0 时保持显示。 */
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

export type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  children?: ReactNode;
  intent?: IBKIntent;
  position?: NotificationPosition;
  actions?: NotificationAction[];
  /** 倒计时总时长（毫秒）；由 Provider 从 input.duration 传入。 */
  duration?: number;
  /** 自动关闭的时间戳，用于使进度条与关闭定时器同步。 */
  expiresAt?: number;
  closing?: boolean;
};

export type NotificationProps = {
  item: NotificationItem;
  onClose: (id: string) => void;
};


export type NotificationProviderProps = {
  children?: ReactNode;
};
