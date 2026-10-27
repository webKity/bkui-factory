import type { ReactNode } from 'react';
import type { IBKSize, IBKResponsiveSize, IBKIntent } from '../types/base';

export interface IAlertProps {
  message: string;
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  className?: string;
  contentClassName?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  description?: string;
  action?: ReactNode;               // 自定义操作项
  closable?: boolean;               // 默认不显示关闭按钮
  onClose?: () => void;             // 关闭动画结束后触发的回调函数
}
