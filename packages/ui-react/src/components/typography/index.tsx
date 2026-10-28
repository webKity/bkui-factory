'use client';

import { forwardRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getTypographySizeStyle } from './size';
import './index.css';

import type { TypographyProps } from './type';

export type { TypographyProps } from './type';

export const Typography = forwardRef<HTMLElement, TypographyProps>(function Typography(props, ref) {
  const { as: Component = 'div', children, className, size = 'base', preLine = false, style, ...rest } = props;

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

Typography.displayName = 'Typography';
export default Typography;
