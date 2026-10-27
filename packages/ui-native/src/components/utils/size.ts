import { useWindowDimensions } from 'react-native';
import type { IBKBreakpoints, IBKResponsiveSize, IBKSize } from '../types/base';

export const componentSizes = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const satisfies readonly IBKSize[];
export const sizeBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const satisfies readonly IBKBreakpoints[];
export type SizeScope = 'base' | IBKBreakpoints;

export function assertComponentSize(value: unknown, field = 'size'): asserts value is IBKSize {
  if (!componentSizes.includes(value as IBKSize)) throw new Error(`${field}：未知尺寸 ${String(value)}`);
}

/** 基础尺寸必须显式提供；可选断点只负责主动切换尺寸。 */
export function mapResponsiveSize(size: IBKSize | IBKResponsiveSize, visit: (scope: SizeScope, value: IBKSize) => void): void {
  if (typeof size === 'string') {
    assertComponentSize(size);
    visit('base', size);
    return;
  }
  if (!size || typeof size !== 'object' || Array.isArray(size) || !Object.hasOwn(size, 'base')) {
    throw new Error('size：响应式配置必须显式提供 base 尺寸');
  }
  for (const [scope, value] of Object.entries(size)) {
    if (scope !== 'base' && !sizeBreakpoints.includes(scope as IBKBreakpoints)) throw new Error(`size：未知断点 ${scope}`);
    assertComponentSize(value, `size.${scope}`);
  }
  visit('base', size.base);
  for (const breakpoint of sizeBreakpoints) {
    if (Object.hasOwn(size, breakpoint)) visit(breakpoint, size[breakpoint]!);
  }
}


const breakpoints = { base: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
export function resolveResponsiveSize(size: IBKSize | IBKResponsiveSize, width: number): IBKSize {
  let result: IBKSize;
  mapResponsiveSize(size, (scope, value) => { if (width >= breakpoints[scope]) result = value; });
  return result!;
}
export function useResponsiveSize(size: IBKSize | IBKResponsiveSize): IBKSize {
  return resolveResponsiveSize(size, useWindowDimensions().width);
}
