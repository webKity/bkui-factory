
import type { Key, ReactNode } from 'react';

export type IBKTheme = 'black' | 'light';

export type IBKVariants = 'line' | 'fill' | 'ghost';

export type IBKSize = '2xs' | 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export type IBKIntent = 'info' | 'success' | 'error' | 'warning' | 'normal';

export type IBKLayout = 'horizontal' | 'vertical'

export enum IBKDirection { up, down, left, right }

/**
 * sm: @media (width >= 40rem)
 * md: @media (width >= 48rem)
 * lg: @media (width >= 64rem)
 * xl: @media (width >= 80rem)
 * 2xl: @media (width >= 96rem)
 */
export type IBKBreakpoints = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IBKResponsiveSize {
  '2xl'?: IBKSize;
  xl?: IBKSize;
  lg?: IBKSize;
  md?: IBKSize;
  sm?: IBKSize;
}

export type BaseProps<T> = {
  /**
   * 控制组件是否显示
   */
  visible?: boolean;
  /**
   * 定义组件的大小，可选值为 small（小）、middle（中）或 large（大）
   */
  size?: IBKSize | IBKResponsiveSize;
  /**
   * 是否禁用组件
   */
  disabled?: boolean;
  /**
   * 组件的默认值
   */
  defaultValue?: T;
  /**
   * 组件的当前值
   */
  value?: T;
  /**
   * 当组件被点击时的回调函数
   */
  onClick?: (event: any) => void;
  /**
   * 当组件值变化时的回调函数
   */
  onChange?: (value: T) => void;
}

export type IOptionValue = string | number;
export interface IOptionItem {
  label: ReactNode;
  value: IOptionValue;
  key?: Key;
  other?: ReactNode;
  className?: string;
  labelClassName?: string;
  activeClassName?: string;
}

export interface IStatusEvent {
  onOpen?: () => void;
  onClose?: () => void;
}

export interface ILifeCycle {
  mounted?: () => void;
  unmounted?: () => void;
}

export interface IBaseLabelItem {
  value: string;
  label: string;
}

export type IBKBaseLayout = 'horizontal' | 'vertical'

export type IBKFormLayout = IBKBaseLayout | 'inline'

export interface IModalInstance {
  open: () => void;
  close: () => void;
}
