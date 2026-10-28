import type { IBKIntent } from '../types/base';
import type { ReactNode } from 'react';

export interface ToastConfigType {
  intent?: IBKIntent;
  msg: string;
  /** 默认使用对应 intent 的图标；null 隐藏图标。 */
  icon?: ReactNode;
  /** 自动关闭时间（毫秒），默认 3000；非有限值或小于等于 0 时持续显示。 */
  duration?: number;
  className?: string;
  /** 自动关闭后触发；showToast 手动关闭或被下一条替换时也会触发。组件外部隐藏或卸载不会触发。 */
  onClose?: () => void;
}

export interface ToastProps extends ToastConfigType {
  /** 默认 true；由 false 切换到 true，或更新 msg / duration 时重新计时。 */
  visible?: boolean;
}
