import type { ComponentProps } from 'react';
import type { IBKVariants, IBKSize, IBKResponsiveSize, IBKIntent } from '../types/base';

export type StepDirection = 'up' | 'down';

export type StepReason = 'ok' | 'boundary' | 'invalid-step';

export type StepValidateParams = {
  direction: StepDirection;
  currentValue: string;
  nextValue: string;
  reason: StepReason;
};

export type StepValidator = (params: StepValidateParams) => boolean;

/**
 * type="number" 为非负十进制文本输入：支持 locale 小数点，不支持千分位。
 * required 仍生效；min/max/step 只用于步进，不提供浏览器原生数字校验。
 * readOnly 禁止编辑值，但允许切换密码可见性。
 */
export type InputProps = Omit<ComponentProps<'input'>, 'size' | 'style'> & {
  clearable?: boolean;
  /** 小数位数；步进的 min 向上、max 向下收敛到该精度，空区间不可步进。 */
  decimal?: number;
  showNumberStepper?: boolean;
  /** min/max/step 用于步进计算；min 低于 0 时按 0 处理。 */
  stepValidator?: StepValidator;
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  variant?: IBKVariants;
};

export type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'style'> & {
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  variant?: IBKVariants;
};

export type InputGroupAddonAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

export type InputGroupProps = Omit<React.ComponentProps<'div'>, 'style'> & {
  /** 组内 Input / Textarea 的默认禁用状态，子组件可显式覆盖；自定义附加按钮需自行设置 disabled。 */
  disabled?: boolean;
  /** 组内 Input / Textarea 的默认只读状态，子组件可显式覆盖。 */
  readOnly?: boolean;
  intent?: IBKIntent;
  size?: IBKSize | IBKResponsiveSize;
  variant?: IBKVariants;
};

export type InputGroupAddonProps = Omit<React.ComponentProps<'div'>, 'style'> & {
  /** 默认 inline-start（前缀）；后缀请显式传 inline-end，不由 DOM 顺序决定。 */
  align?: InputGroupAddonAlign;
};

export type InputGroupTextProps = Omit<React.ComponentProps<'span'>, 'style'>;

/** Input 的组合用法别名；直接在 InputGroup 内使用 Input 同样有效。 */
export type InputGroupInputProps = InputProps;

/** Textarea 的组合用法别名，保留原生 textarea slot。 */
export type InputGroupTextareaProps = TextareaProps;
