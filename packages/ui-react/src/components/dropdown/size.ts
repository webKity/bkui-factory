import type { CSSProperties } from 'react';
import type { DropdownProps } from './type';
import { mapResponsiveSize } from '../utils/size';

export function getDropdownSizeStyle(size: NonNullable<DropdownProps['size']>) {
  const style: CSSProperties & Record<`--dropdown-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size', 'item-radius']) {
      style[`--dropdown-${scope}-${dimension}`] = `var(--dropdown-size-${value}-${dimension})`;
    }
  });
  return style;
}
