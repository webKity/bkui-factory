import type { CSSProperties } from 'react';
import type { TooltipProps } from './type';
import { mapResponsiveSize } from '../utils/size';

/** 与 Button 共用尺寸映射约定，断点切换只使用 CSS。 */
export function getTooltipSizeStyle(size: NonNullable<TooltipProps['size']>) {
  const style: CSSProperties & Record<`--tooltip-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['padding-x', 'padding-y', 'font-size', 'line-height']) {
      style[`--tooltip-${scope}-${dimension}`] = `var(--tooltip-size-${value}-${dimension})`;
    }
  });
  return style;
}
