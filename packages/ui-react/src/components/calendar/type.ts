import type { DayPickerProps } from 'react-day-picker';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

/** 保留 DayPicker 按 mode / required 区分的联合类型。 */
export type CalendarProps = DayPickerProps & {
  /** 七档尺寸；响应式配置必须提供 base。 */
  size?: IBKSize | IBKResponsiveSize;
};

export type { DateRange, Matcher } from 'react-day-picker';
