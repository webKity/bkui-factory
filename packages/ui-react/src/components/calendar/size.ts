import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

/** 与 Button 一样只映射局部 token；断点切换交由 CSS。 */
export function getCalendarSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--calendar-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['day-size', 'font-size', 'line-height', 'padding', 'gap', 'icon-size'] as const) {
      style[`--calendar-${scope}-${dimension}`] = `var(--calendar-size-${value}-${dimension})`;
    }
  });
  return style;
}
