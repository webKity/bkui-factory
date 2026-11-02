import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

type AvatarSizeStyle = CSSProperties & { [key: `--avatar-${string}`]: string };

export const avatarSizeDimensions = ['size', 'font-size'] as const;

/** 沿用共享尺寸校验：缺少 base、未知尺寸或断点均抛错，不生成失效引用。 */
export function getAvatarSizeStyle(size: IBKSize | IBKResponsiveSize): AvatarSizeStyle {
  const style: AvatarSizeStyle = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of avatarSizeDimensions) {
      style[`--avatar-${scope}-${dimension}`] = `var(--avatar-size-${value}-${dimension})`;
    }
  });
  return style;
}
