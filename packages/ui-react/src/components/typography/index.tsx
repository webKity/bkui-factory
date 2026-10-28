'use client';

import { forwardRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getTypographySizeStyle } from './size';
import './index.css';

import type { ElementType } from 'react';
import type { TypographyComponent, TypographyProps } from './type';

export type { TypographyProps, TypographyComponent } from './type';

const TypographyImpl = forwardRef<Element, TypographyProps<ElementType>>(function Typography(props, ref) {
  const { as: Component = 'div', children, className, size = 'base', preLine = false, style, ...rest } = props;

  // data-size 记录配置模式；data-size-* 仅标记显式响应式断点，样式通过局部 token 切换。
  return (
    <Component
      {...rest}
      ref={ref}
      className={['bk-typography', className].filter(Boolean).join(' ')}
      style={{ ...getTypographySizeStyle(size), ...style }}
      {...getResponsiveSizeAttributes(size)}
      data-size={typeof size === 'string' ? size : 'responsive'}
      data-pre-line={preLine || undefined}
    >
      {children}
    </Component>
  );
});

TypographyImpl.displayName = 'Typography';
export const Typography = TypographyImpl as TypographyComponent;
export default Typography;
