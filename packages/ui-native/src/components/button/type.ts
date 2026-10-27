import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, TextStyle } from 'react-native';
import type { ButtonOptions } from './tokens';
import type { IBKSize, IBKResponsiveSize } from '../types/base';
export interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'>, Omit<ButtonOptions, 'pressed' | 'size'> {
  children?: ReactNode;
  size?: IBKSize | IBKResponsiveSize;
  className?: string;
  textClassName?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  block?: boolean;
  textStyle?: StyleProp<TextStyle>;
}
