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
  /** 数字支持秒级或毫秒级 Unix 时间戳；字符串请传 ISO 日期，数字字符串不作为时间戳解析。优先于 duration。挂载前先显示占位以保证 SSR 一致。 */
  targetTime?: CountdownTimeInput;
  /** 时长，单位秒；支持小数，换算后四舍五入至整数毫秒。 */
  duration?: number;
  /** 受控剩余时间，单位毫秒；仅展示，不启动计时器或触发回调。移除 value 后按当前来源重新开始（duration 全时长，targetTime 绝对时间）。 */
  value?: number;
  /** 默认 true；false 固定初始值，切回 true 后重新开始计算。 */
  autoStart?: boolean;
  /** 更新间隔，单位毫秒，默认 1000；修改只改变更新节奏，不重置截止时间。到期时提前执行最后一次更新。 */
  interval?: number;
  /** 仅在计时 tick 时通知，不同步通知初始值；零时长/已过期来源在挂载后通过一次异步 tick 通知 0，再触发 onFinish。受控或 autoStart=false 不通知。 */
  onChange?: (remaining: number, parts: CountdownParts) => void;
  onFinish?: () => void;
}

export interface CountdownProps extends UseCountdownOptions,
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'style' | 'dangerouslySetInnerHTML'> {
  /** alarm 使用累计小时（48:00:00）；otp 使用总秒数；day/date/custom 自动单位固定为天、时、分、秒。 */
  scene?: CountdownScene;
  animation?: CountdownAnimation;
  /** 默认 auto；显式单位按天、时、分、秒排序，第一个展示单位累计未展示的高位时间。 */
  units?: CountdownUnit[] | 'auto';
  labels?: Partial<Record<CountdownUnit, string>>;
  showLabels?: boolean;
  /** 默认 true；false 隐藏前导零单位，全零时仍保留最后一个单位。 */
  showZeroUnits?: boolean;
  padDays?: boolean;
  /** undefined 使用默认分隔符；null、布尔值、空字符串不生成分隔符和额外间距。函数参数对应前一个单位及其索引。 */
  separator?: ReactNode | ((unit: CountdownUnit, index: number, items: CountdownItem[]) => ReactNode);
  className?: string;
  itemClassName?: string;
  digitClassName?: string;
  labelClassName?: string;
  separatorClassName?: string;
  /** 完成后优先于 render/children；null/undefined 回退到自定义或默认数字，false/空字符串显式隐藏内容。 */
  expiredText?: ReactNode;
  /** 自定义布局，优先于 children；targetTime 的首次挂载前占位阶段不调用。 */
  render?: CountdownRender;
  children?: CountdownRender;
}
