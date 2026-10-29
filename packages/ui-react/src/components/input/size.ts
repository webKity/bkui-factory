import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { getResponsiveSizeAttributes, mapResponsiveSize } from '../utils/size';

const dimensions = [
  'height',
  'padding-x',
  'padding-y',
  'font-size',
  'line-height',
  'gap',
  'icon-size',
] as const;

export function getInputSizeProps(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & { [key: `--input-${string}`]: string } = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of dimensions) {
      style[`--input-${scope}-${dimension}`] = `var(--input-size-${value}-${dimension})`;
    }
  });

  return {
    style,
    'data-size': typeof size === 'string' ? size : 'responsive',
    ...getResponsiveSizeAttributes(size),
  };
}
