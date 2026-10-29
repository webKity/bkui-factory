import { mapResponsiveSize } from '../utils/size';

import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export function getTypographySizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & { [key: `--typography-${string}`]: string } = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['font-size', 'line-height', 'heading-scale']) {
      style[`--typography-${scope}-${dimension}`] = `var(--typography-size-${value}-${dimension})`;
    }
  });

  return style;
}
