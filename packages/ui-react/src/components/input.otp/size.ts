import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

const dimensions = ['slot-size', 'font-size', 'line-height', 'gap'] as const;

type InputOTPSizeStyle = CSSProperties & { [key: `--input-otp-${string}`]: string };

/** 只映射组件尺寸 tokens，断点切换由 CSS 负责。 */
export function getInputOTPSizeStyle(size: IBKSize | IBKResponsiveSize): InputOTPSizeStyle {
  const style: InputOTPSizeStyle = {};
  mapResponsiveSize(size, (scope, value) => {
    for (const dimension of dimensions) {
      style[`--input-otp-${scope}-${dimension}`] = `var(--input-otp-size-${value}-${dimension})`;
    }
  });

  return style;
}
