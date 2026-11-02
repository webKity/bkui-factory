import type { CSSProperties } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

export function getRadioSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--radio-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'circle-size', 'icon-size'] as const) {
      style[`--radio-${scope}-${dimension}`] = `var(--radio-size-${value}-${dimension})`;
    }
  });
  return style;
}
