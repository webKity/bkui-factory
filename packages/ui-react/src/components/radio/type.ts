import type { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ReactElement, RefAttributes } from 'react';
import type { IBKSize, IBKResponsiveSize, IBKIntent, IBKVariants, IOptionItem, IOptionValue } from '../types/base';

export type RadioOption<T extends IOptionValue = IOptionValue> = Omit<IOptionItem, 'value'> & {
  /** 文案可以包含装饰节点，但不要嵌套链接、按钮等交互元素。 */
  label: IOptionItem['label'];
  /** 可选描述；不要包含交互元素，空字符串与布尔值不渲染描述节点。 */
  other?: IOptionItem['other'];
  value: T;
  disabled?: boolean;
};

export type RadioChangeEventDetails = BaseRadioGroup.ChangeEventDetails;

export interface IRadiosProps<T extends IOptionValue = IOptionValue> extends Omit<
  BaseRadioGroup.Props<T>,
  'children' | 'render' | 'ref' | 'style' | 'className' | 'onChange' | 'onValueChange'
> {
  options: RadioOption<T>[];
  value?: T;
  defaultValue?: T;
  variant?: IBKVariants;
  /** fill 的圆角形式：默认全圆角；false 使用普通圆角。 */
  round?: boolean;
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  disabled?: boolean;
  /** 使用 className 和局部 CSS tokens 自定义样式，不支持 style。 */
  className?: string;
  itemClassName?: string;
  indicatorClassName?: string;
  labelClassName?: string;
  onChange?: (val: T, details: RadioChangeEventDetails) => void;
}

export type RadiosProps<T extends IOptionValue = IOptionValue> = IRadiosProps<T>;

export interface RadiosComponent {
  <T extends IOptionValue = IOptionValue>(props: IRadiosProps<T> & RefAttributes<HTMLDivElement>): ReactElement | null;
}

/** @deprecated 保留初始类型兼容；请通过 RadiosProps.options 配置选项。 */
export interface IRadioItemProps {
  id: string;
  option: RadioOption;
  intent?: IBKIntent;
  value?: IOptionValue;
  size: IBKSize;
  disabled?: boolean;
  labelClassName?: string;
  itemClassName?: string;
  indicatorClassName?: string;
}
