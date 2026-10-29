import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

const dimensions = ['font-size', 'line-height', 'gap', 'icon-size'] as const;

/** 只设置局部 token 引用；断点切换由 CSS 完成。 */
export function getBreadcrumbSizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--breadcrumb-${string}`, string> = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of dimensions) {
      style[`--breadcrumb-${scope}-${dimension}`] = `var(--breadcrumb-size-${value}-${dimension})`;
    }
  });

  return style;
}
