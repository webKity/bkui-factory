import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react';
import type { IBKVariants, IBKSize, IBKResponsiveSize, IBKIntent } from '../types/base';

/** 按钮几何形状；与 variant（视觉风格）正交。 */
export type ButtonShape = 'rect' | 'square';

/**
 * 宽度模式：
 * - 'auto'（默认）：宽度由内容 + padding-x 决定。
 * - 'fixed'：内容区锁定为 --button-fixed-width（每 size 一个值），
 *   padding-x 照常叠加，视觉总宽 = content-width + 2 × padding-x + 2 × border-width。
 *   内容溢出时文本截断省略号，图标保留。
 */
export type ButtonWidthMode = 'auto' | 'fixed';

interface ButtonCommonProps {
  children?: ReactNode;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  className?: string;
  intent?: IBKIntent;
  variant?: IBKVariants;
  shape?: ButtonShape;
  widthMode?: ButtonWidthMode;
  size?: IBKSize | IBKResponsiveSize;
  block?: boolean;
  round?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export type ButtonNativeProps = ButtonCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonCommonProps | 'style' | 'onClick'> & {
    link?: undefined;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

export type ButtonLinkProps = ButtonCommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof ButtonCommonProps | 'style' | 'href' | 'type' | 'onClick'
  > & {
    link: string;
    type?: never;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  };

export type ButtonProps = ButtonNativeProps | ButtonLinkProps;

/** link 存在时，事件和 ref 对应 HTMLAnchorElement；否则对应 HTMLButtonElement。 */
export interface ButtonComponent {
  (props: ButtonLinkProps & RefAttributes<HTMLAnchorElement>): ReactElement | null;
  (props: ButtonNativeProps & RefAttributes<HTMLButtonElement>): ReactElement | null;
}
