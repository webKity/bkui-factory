import type { CSSProperties } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

const dimensions = ['font-size', 'time-font-size', 'line-height', 'marker-size', 'gap', 'item-gap'] as const;
export function getTimelineSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--timeline-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of dimensions) {
      style[`--timeline-${scope}-${dimension}`] = `var(--timeline-size-${value}-${dimension})`;
    }
  });
  return style;
}
