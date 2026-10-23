import type { HTMLAttributes } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';

export type LoadingType = 'normal' | 'rect' | 'logo';
export type LoadingSize = IBKSize | IBKResponsiveSize | number;

export interface LoadingProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'dangerouslySetInnerHTML'> {
  type?: LoadingType;
  size?: LoadingSize;
  fillColor?: string;
  /** One animation cycle in milliseconds; defaults depend on the loading type. */
  speed?: number;
  /** Defaults to 加载中. Use aria-hidden when the parent already announces loading. */
  ariaLabel?: string;
}
