import type { CSSProperties } from 'react';
import type { RatingProps } from './type';
import { mapResponsiveSize } from '../utils/size';

/** 与 Button 一样只映射尺寸 token，响应式切换交由 CSS。 */
export function getRatingSizeStyle(size: NonNullable<RatingProps['size']>) {
  const style: CSSProperties & Record<`--rating-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['icon-size', 'gap'] as const) {
      style[`--rating-${scope}-${dimension}`] = `var(--rating-size-${value}-${dimension})`;
    }
  });
  return style;
}
