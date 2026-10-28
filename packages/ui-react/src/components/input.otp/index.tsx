'use client';

import { OTPField } from '@base-ui/react/otp-field';
import { forwardRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getInputOTPSizeStyle } from './size';
import './index.css';

import type { OTPFieldRootProps } from '@base-ui/react/otp-field';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export type InputOTPProps = Omit<OTPFieldRootProps, 'length'> & {
  /** 输入内容的显示方式；传入后会覆盖 Base UI 的 mask 属性。未传时遵循 mask。 */
  type?: 'text' | 'password';
  size?: IBKSize | IBKResponsiveSize;
  /** 输入位数，默认为 6；非正安全整数会回退为 6。自定义 children 时需保证输入框数量与 length 一致。 */
  length?: OTPFieldRootProps['length'];
};

export const InputOTP = forwardRef<HTMLDivElement, InputOTPProps>(function InputOTP({
  type, size = 'base', length = 6, mask, children, className, style, ...rest
}, ref) {
  const safeLength = Number.isSafeInteger(length) && length > 0 ? length : 6;
  if (process.env.NODE_ENV !== 'production' && safeLength !== length) {
    console.error(`[InputOTP] length 必须为正安全整数，收到 ${String(length)}，已回退为 6`);
  }
  const sizeStyle = getInputOTPSizeStyle(size);

  return (
    <OTPField.Root
      {...rest}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      length={safeLength}
      mask={type === undefined ? mask : type === 'password'}
      data-size={typeof size === 'string' ? size : 'responsive'}
      className={state => ['bkreact-input-otp', typeof className === 'function' ? className(state) : className].filter(Boolean).join(' ')}
      style={state => ({ ...sizeStyle, ...(typeof style === 'function' ? style(state) : style) })}
    >
      {children ?? Array.from({ length: safeLength }, (_, index) => (
        <OTPField.Input key={index} className="bkreact-input-otp__input" />
      ))}
    </OTPField.Root>
  );
});

InputOTP.displayName = 'InputOTP';
export default InputOTP;
