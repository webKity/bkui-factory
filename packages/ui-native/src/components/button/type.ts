import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, TextStyle } from 'react-native';
import type { IBKIntent, IBKVariants, IBKSize, IBKResponsiveSize } from '../types/base';
/** 几何形状独立于视觉 variant；圆形使用 square + round。 */
export type ButtonShape = 'rect' | 'square';
/** fixed 锁定内容区，外框宽度另加两侧 padding 与 border。 */
export type ButtonWidthMode = 'auto' | 'fixed';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'> {
  children?: ReactNode;
  intent?: IBKIntent;
  variant?: IBKVariants;
  shape?: ButtonShape;
  widthMode?: ButtonWidthMode;
  size?: IBKSize | IBKResponsiveSize;
  /** 与 Web 相同：block > shape > widthMode。 */
  block?: boolean;
  round?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
}
