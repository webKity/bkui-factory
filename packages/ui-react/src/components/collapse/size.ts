import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

export function getCollapseSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--collapse-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['font-size', 'line-height', 'padding-x', 'padding-y', 'gap', 'icon-size'] as const) {
      style[`--collapse-${scope}-${dimension}`] = `var(--collapse-size-${value}-${dimension})`;
    }
  });
  return style;
}
