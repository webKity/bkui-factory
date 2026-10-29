import type { CSSProperties } from 'react';
import type { PaginationProps } from './type';
import { mapResponsiveSize } from '../utils/size';

// 与 Button 的七档高度一致，省略号使用相同的字号语义 token。
const heights = {
  '2xs': 24,
  xs: 28,
  sm: 32,
  base: 40,
  lg: 44,
  xl: 48,
  '2xl': 56,
} as const;

export function getPaginationSizeStyle(size: NonNullable<PaginationProps['size']>) {
  const style: CSSProperties & Record<`--pagination-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    style[`--pagination-${scope}-width`] = `${heights[value]}px`;
    style[`--pagination-${scope}-font-size`] = `var(--text-${value}-size)`;
  });

  return style;
}
