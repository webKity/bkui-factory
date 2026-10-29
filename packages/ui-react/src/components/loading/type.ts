import type { HTMLAttributes } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';

export type LoadingType = 'normal' | 'rect' | 'logo';
export type LoadingSize = IBKSize | IBKResponsiveSize | number;

export interface LoadingProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'style' | 'children' | 'dangerouslySetInnerHTML'
> {
  type?: LoadingType;
  /** Numeric sizes must be finite and non-negative; invalid numbers fall back to base. */
  size?: LoadingSize;
  fillColor?: string;
  /**
   * One animation cycle in milliseconds; defaults depend on the loading type.
   */
  speed?: number;
}
