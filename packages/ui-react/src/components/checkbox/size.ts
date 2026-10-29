import type { CSSProperties } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

/** 与 Button 一样只映射局部尺寸 token，断点切换交由 CSS。 */
export function getCheckboxSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--checkbox-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['box-size', 'icon-size', 'font-size', 'line-height', 'gap'] as const) {
      style[`--checkbox-${scope}-${dimension}`] = `var(--checkbox-size-${value}-${dimension})`;
    }
  });
  return style;
}
