import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

const dimensions = ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size'] as const;
const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
type ButtonSizeStyle = CSSProperties & { [key: `--button-${string}`]: string };

/** 只设置 Button 自己的 token 引用；媒体查询在 CSS 中处理，无需监听窗口。 */
export function getButtonSizeStyle(size: IBKSize | IBKResponsiveSize): ButtonSizeStyle {
  const style: ButtonSizeStyle = {};
  const setSize = (scope: string, value: IBKSize) => {
    for (const dimension of dimensions) {
      style[`--button-${scope}-${dimension}`] = `var(--button-size-${value}-${dimension})`;
    }
  };
  setSize('base', typeof size === 'string' ? size : 'base');
  if (typeof size === 'object') {
    for (const breakpoint of breakpoints) {
      const value = size[breakpoint];
      if (value) setSize(breakpoint, value);
    }
  }
  return style;
}
