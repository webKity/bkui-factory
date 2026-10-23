import type { CSSProperties } from 'react';
import type { LoadingSize } from './type';
import { componentSizes, mapResponsiveSize } from '../utils/size';

type LoadingSizeStyle = CSSProperties & { [key: `--loading-${string}`]: string };

export function getLoadingSizeStyle(size: LoadingSize): LoadingSizeStyle {
  const style: LoadingSizeStyle = {};
  if (typeof size === 'number') {
    if (Number.isFinite(size) && size >= 0) style['--loading-base-size'] = `${size}px`;
    return style;
  }
  mapResponsiveSize(size, (scope, value) => {
    if (componentSizes.includes(value)) style[`--loading-${scope}-size`] = `var(--loading-size-${value})`;
  });
  return style;
}
