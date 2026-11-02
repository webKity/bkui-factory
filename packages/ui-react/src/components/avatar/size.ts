import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

type AvatarSizeStyle = CSSProperties & { [key: `--avatar-${string}`]: string };

export function getAvatarSizeStyle(size: IBKSize | IBKResponsiveSize): AvatarSizeStyle {
  const style: AvatarSizeStyle = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['size', 'font-size'] as const) {
      style[`--avatar-${scope}-${dimension}`] = `var(--avatar-size-${value}-${dimension})`;
    }
  });
  return style;
}
