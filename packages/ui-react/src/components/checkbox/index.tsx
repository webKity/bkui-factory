'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Children, forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getCheckboxSizeStyle } from './size';
import type { CheckboxProps } from './type';
import './index.css';

export type { CheckboxProps, ICheckboxProps, CheckboxChangeEventDetails } from './type';

export const Checkbox = forwardRef<ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(function Checkbox(
  { children, size = 'base', className, style, onChange, ...restProps },
  ref,
) {
  // JS 调用方可继续使用 primitive 回调；公开 API 以 onChange 为准。
  const { onCheckedChange, ...rootProps } = restProps as typeof restProps & Pick<CheckboxPrimitive.Root.Props, 'onCheckedChange'>;
  const sizeStyle = getCheckboxSizeStyle(size);
  const hasLabel = Children.toArray(children).some(child => typeof child !== 'string' || child.trim().length > 0);
  if (process.env.NODE_ENV !== 'production' && !hasLabel &&
    !rootProps['aria-label']?.trim() && !rootProps['aria-labelledby']?.trim()) {
    console.warn('[Checkbox] 无文案时必须提供 aria-label 或 aria-labelledby');
  }

  return (
    <CheckboxPrimitive.Root
      {...rootProps}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      className={state => ['bkreact-checkbox', typeof className === 'function' ? className(state) : className].filter(Boolean).join(' ')}
      style={state => ({ ...sizeStyle, ...(typeof style === 'function' ? style(state) : style) })}
      data-size={typeof size === 'string' ? size : 'responsive'}
      onCheckedChange={onChange ?? onCheckedChange}
    >
      <span className="bkreact-checkbox__box" aria-hidden="true">
        <CheckboxPrimitive.Indicator className="bkreact-checkbox__indicator" keepMounted>
          <svg className="bkreact-checkbox__check" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
            <path d="m3 8 3.25 3.25L13 4.5" />
          </svg>
          <svg className="bkreact-checkbox__mixed" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
            <path d="M3 8h10" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </span>
      {children != null && <span className="bkreact-checkbox__label">{children}</span>}
    </CheckboxPrimitive.Root>
  );
});

export default Checkbox;
