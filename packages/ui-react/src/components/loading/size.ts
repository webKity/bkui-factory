import type { CSSProperties } from 'react';
import type { LoadingSize } from './type';
import { mapResponsiveSize } from '../utils/size';

type LoadingSizeStyle = CSSProperties & { [key: `--loading-${string}`]: string };

export function getLoadingSizeStyle(size: LoadingSize): LoadingSizeStyle {
  const style: LoadingSizeStyle = {};
  if (typeof size === 'number') {
    if (!Number.isFinite(size) || size < 0) throw new Error(`Loading.size：尺寸必须为非负有限数值，收到 ${size}`);
    style['--loading-base-size'] = `${size}px`;
    return style;
  }
  mapResponsiveSize(size, (scope, value) => {
    style[`--loading-${scope}-size`] = `var(--loading-size-${value})`;
  });
  return style;
}
