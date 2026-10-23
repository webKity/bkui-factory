import type { CSSProperties } from 'react';
import type { IBKSize } from '../types/base';
import type { LoadingSize } from './type';

const sizes: readonly IBKSize[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];
const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
type LoadingSizeStyle = CSSProperties & { [key: `--loading-${string}`]: string };

export function getLoadingSizeStyle(size: LoadingSize): LoadingSizeStyle {
  const style: LoadingSizeStyle = {};
  if (typeof size === 'number') {
    if (Number.isFinite(size) && size >= 0) style['--loading-base-size'] = `${size}px`;
    return style;
  }
  const setSize = (scope: string, value: IBKSize) => {
    if (sizes.includes(value)) style[`--loading-${scope}-size`] = `var(--loading-size-${value})`;
  };
  setSize('base', typeof size === 'string' ? size : 'base');
  if (typeof size === 'object') {
    for (const breakpoint of breakpoints) {
      const value = size[breakpoint];
      if (value) setSize(breakpoint, value);
    }
  }
  return style;
}
