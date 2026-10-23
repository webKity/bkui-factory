import type { IBKBreakpoints, IBKResponsiveSize, IBKSize } from '../types/base';

export const componentSizes = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const satisfies readonly IBKSize[];
export const sizeBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const satisfies readonly IBKBreakpoints[];

export type SizeScope = 'base' | IBKBreakpoints;

/** 遍历基础尺寸及显式配置的断点；token 生成和 CSS 回退由组件负责。 */
export function mapResponsiveSize(
  size: IBKSize | IBKResponsiveSize,
  visit: (scope: SizeScope, value: IBKSize) => void,
): void {
  visit('base', typeof size === 'string' ? size : 'base');
  if (typeof size === 'object') {
    for (const breakpoint of sizeBreakpoints) {
      const value = size[breakpoint];
      if (value) visit(breakpoint, value);
    }
  }
}
