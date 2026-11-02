import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

type AttachmentSizeStyle = CSSProperties & { [key: `--attachment-${string}`]: string };

export function getAttachmentSizeStyle(size: IBKSize | IBKResponsiveSize): AttachmentSizeStyle {
  const style: AttachmentSizeStyle = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of ["gap", "content-gap", "font-size", "line-height", "desc-font-size", "desc-line-height"] as const) {
      style[`--attachment-${scope}-${dimension}`] = `var(--attachment-size-${value}-${dimension})`;
    }
  });
  return style;
}
