import type { ViewProps } from 'react-native';
import type { IBKSize, IBKResponsiveSize } from '../types/base';
export type LoadingType = 'normal' | 'rect' | 'logo';
export type LoadingSize = IBKSize | IBKResponsiveSize | number;
export interface LoadingProps extends Omit<ViewProps, 'children'> {
  type?: LoadingType;
  size?: LoadingSize;
  fillColor?: string;
  speed?: number;
  ariaLabel?: string;
  className?: string;
}
