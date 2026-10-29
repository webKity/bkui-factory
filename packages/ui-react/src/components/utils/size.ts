import type { IBKBreakpoints, IBKResponsiveSize, IBKSize } from '../types/base';

export const componentSizes = [
  '2xs',
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
] as const satisfies readonly IBKSize[];
/** CSS min-width 的 rem 值；scope 列表和 CSS 契约测试共用此定义。 */
export const sizeBreakpointMinWidths = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  '2xl': 96,
} as const satisfies Record<IBKBreakpoints, number>;
export const sizeBreakpoints = Object.keys(sizeBreakpointMinWidths) as readonly IBKBreakpoints[];

export type SizeScope = 'base' | IBKBreakpoints;

export function assertComponentSize(value: unknown, field = 'size'): asserts value is IBKSize {
  if (!componentSizes.includes(value as IBKSize)) {
    throw new Error(`${field}：未知尺寸 ${String(value)}`);
  }
}

/** 基础尺寸必须显式提供；可选断点只负责主动切换尺寸。 */
export function mapResponsiveSize(
  size: IBKSize | IBKResponsiveSize,
  visit: (scope: SizeScope, value: IBKSize) => void,
): void {
  if (typeof size === 'string') {
    assertComponentSize(size);
    visit('base', size);

    return;
  }

  if (!size || typeof size !== 'object' || Array.isArray(size) || !Object.hasOwn(size, 'base')) {
    throw new Error('size：响应式配置必须显式提供 base 尺寸');
  }

  for (const [scope, value] of Object.entries(size)) {
    if (scope !== 'base' && !sizeBreakpoints.includes(scope as IBKBreakpoints)) {
      throw new Error(`size：未知断点 ${scope}`);
    }
    assertComponentSize(value, `size.${scope}`);
  }

  visit('base', size.base);

  for (const breakpoint of sizeBreakpoints) {
    if (Object.hasOwn(size, breakpoint)) visit(breakpoint, size[breakpoint]!);
  }
}

/** 只返回 data-size-* 断点标记；data-size 由组件自行设置。 */
export function getResponsiveSizeAttributes(size: IBKSize | IBKResponsiveSize | number) {
  if (!size || typeof size !== 'object') return {};
  return Object.fromEntries(
    sizeBreakpoints.filter(key => Object.hasOwn(size, key)).map(key => [`data-size-${key}`, true]),
  );
}
