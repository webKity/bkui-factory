import type { HTMLAttributes, ReactNode } from 'react';

export type CountdownScene = 'alarm' | 'day' | 'date' | 'otp' | 'custom';
export type CountdownAnimation = 'none' | 'flip' | 'wheel';
export type CountdownUnit = 'days' | 'hours' | 'minutes' | 'seconds';
export type CountdownTimeInput = Date | number | string;

export interface CountdownParts {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface CountdownItem {
  unit: CountdownUnit;
  value: number;
  text: string;
  label: string;
}

export interface CountdownRenderHelpers {
  animation: CountdownAnimation;
  finished: boolean;
  renderDigit: (item: CountdownItem, className?: string) => ReactNode;
}

export type CountdownRender = (
  parts: CountdownParts,
  items: CountdownItem[],
  helpers: CountdownRenderHelpers,
) => ReactNode;

export interface UseCountdownOptions {
  /** 数字支持秒级或毫秒级 Unix 时间戳；优先于 duration。 */
  targetTime?: CountdownTimeInput;
  /** 时长，单位秒。 */
  duration?: number;
  /** 受控剩余时间，单位毫秒；仅展示，不启动计时器或触发回调。 */
  value?: number;
  /** 默认 true；false 固定初始值，切回 true 后重新开始计算。 */
  autoStart?: boolean;
  /** 更新间隔，单位毫秒，默认 1000；到期时提前执行最后一次更新。 */
  interval?: number;
  onChange?: (remaining: number, parts: CountdownParts) => void;
  onFinish?: () => void;
}

export interface CountdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'style' | 'dangerouslySetInnerHTML'> {
  /**
   * 结束时间。适合闹钟、活动截止、按天倒计时等场景。
   * number 支持秒级或毫秒级时间戳。
   */
  targetTime?: CountdownTimeInput;
  /**
   * 倒计时长度，单位秒。适合发送验证码等短倒计时。
   */
  duration?: number;
  /**
   * 受控剩余时间，单位毫秒。传入后组件只负责展示。
   */
  value?: number;
  scene?: CountdownScene;
  animation?: CountdownAnimation;
  autoStart?: boolean;
  interval?: number;
  units?: CountdownUnit[] | 'auto';
  labels?: Partial<Record<CountdownUnit, string>>;
  showLabels?: boolean;
  showZeroUnits?: boolean;
  padDays?: boolean;
  separator?: ReactNode | ((unit: CountdownUnit, index: number, items: CountdownItem[]) => ReactNode);
  className?: string;
  itemClassName?: string;
  digitClassName?: string;
  labelClassName?: string;
  separatorClassName?: string;
  expiredText?: ReactNode;
  render?: CountdownRender;
  children?: CountdownRender;
  onChange?: (remaining: number, parts: CountdownParts) => void;
  onFinish?: () => void;
}
