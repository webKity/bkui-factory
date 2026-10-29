import type { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import type { ReactNode } from 'react';
import type { IBKSize, IBKResponsiveSize } from '../types/base';

export type CheckboxChangeEventDetails = CheckboxPrimitive.Root.ChangeEventDetails;

export type CheckboxProps = Omit<
  CheckboxPrimitive.Root.Props,
  'style' | 'size' | 'onCheckedChange' | 'children'
> & {
  /** 可选文案；独立图标须通过 aria-label 或 aria-labelledby 提供名称。 */
  children?: ReactNode;
  /** 半选仅控制展示和可访问状态，表单是否提交仍由 checked 决定。 */
  indeterminate?: boolean;
  size?: IBKSize | IBKResponsiveSize;
  /**
   * 勾选变化通知；可调用 eventDetails.cancel() 取消本次变化。
   * JS 兼容 primitive 的 onCheckedChange；同时传入时 onChange 优先。
   */
  onChange?: (checked: boolean, eventDetails: CheckboxChangeEventDetails) => void;
};

/** 兼容初始类型命名。 */
export type ICheckboxProps = CheckboxProps;
