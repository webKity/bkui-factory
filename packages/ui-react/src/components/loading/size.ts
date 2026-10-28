import type { CSSProperties } from 'react';
import type { LoadingSize } from './type';
import { mapResponsiveSize } from '../utils/size';

type LoadingSizeStyle = CSSProperties & { [key: `--loading-${string}`]: string };

export function normalizeLoadingSize(size: LoadingSize): LoadingSize {
  if (typeof size === 'number' && (!Number.isFinite(size) || size < 0)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Loading.size：尺寸必须为非负有限数值，收到 ${size}，已回退到 base`,
      );
    }
    return 'base';
  }
  return size;
}

export function getLoadingSizeStyle(size: LoadingSize): LoadingSizeStyle {
  size = normalizeLoadingSize(size);
  const style: LoadingSizeStyle = {};
  if (typeof size === 'number') {
    style['--loading-base-size'] = `${size}px`;
    return style;
  }
  mapResponsiveSize(size, (scope, value) => {
    style[`--loading-${scope}-size`] = `var(--loading-size-${value})`;
  });
  return style;
}
