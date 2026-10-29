import type { ReactNode } from 'react';
import type { IBKSize, IBKResponsiveSize, IBKIntent } from '../types/base';

/** 关闭后保持隐藏；修改内容不会重新打开，需更换 key 重建实例。 */
export interface IAlertProps {
  message: string;
  /** brand 复用 info 反馈语义及蓝色背景。 */
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  className?: string;
  contentClassName?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  /** 空字符串不渲染说明区域。 */
  description?: string;
  action?: ReactNode; // 自定义操作项
  closable?: boolean; // 默认不显示关闭按钮
  onClose?: () => void; // 关闭动画结束后触发的回调函数
}
