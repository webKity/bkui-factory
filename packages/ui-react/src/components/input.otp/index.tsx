'use client';

import { OTPField } from '@base-ui/react/otp-field';
import { forwardRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getInputOTPSizeStyle } from './size';
import './index.css';

import type { OTPFieldRootProps } from '@base-ui/react/otp-field';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export type InputOTPProps = Omit<OTPFieldRootProps, 'length'> & {
  type?: 'text' | 'password';
  size?: IBKSize | IBKResponsiveSize;
  /** 输入位数，默认为 6。 */
  length?: OTPFieldRootProps['length'];
};

export const InputOTP = forwardRef<HTMLDivElement, InputOTPProps>(function InputOTP({
  type, size = 'base', length = 6, mask, children, className, style, ...rest
}, ref) {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new RangeError('InputOTP length 必须为正整数');
  }
  const sizeStyle = getInputOTPSizeStyle(size);

  return (
    <OTPField.Root
      {...rest}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      length={length}
      mask={type === undefined ? mask : type === 'password'}
      data-size={typeof size === 'string' ? size : 'responsive'}
      className={state => ['bkreact-input-otp', typeof className === 'function' ? className(state) : className].filter(Boolean).join(' ')}
      style={state => ({ ...sizeStyle, ...(typeof style === 'function' ? style(state) : style) })}
    >
      {children ?? Array.from({ length }, (_, index) => (
        <OTPField.Input key={index} className="bkreact-input-otp__input" />
      ))}
    </OTPField.Root>
  );
});

InputOTP.displayName = 'InputOTP';
export default InputOTP;
