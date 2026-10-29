import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

const dimensions = ['font-size', 'line-height', 'image-width', 'image-height', 'gap', 'padding-y'] as const;

/** 尺寸只写入局部 token 引用，断点由 CSS 处理。 */
export function getEmptySizeStyle(size: IBKSize | IBKResponsiveSize) {
  const style: CSSProperties & Record<`--empty-${string}`, string> = {};
  try {
    mapResponsiveSize(size, (scope, value) => {
      for (const dimension of dimensions) {
        style[`--empty-${scope}-${dimension}`] = `var(--empty-size-${value}-${dimension})`;
      }
    });
  } catch (error) {
    throw new Error(
      `[Empty] ${error instanceof Error ? error.message : String(error)}。请使用有效尺寸（如 size="base"），或提供包含 base 的响应式对象（如 size={{ base: 'base', md: 'lg' }}）。`,
      { cause: error },
    );
  }
  return style;
}
