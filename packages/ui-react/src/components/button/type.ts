import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react';
import type { IBKVariants, IBKSize, IBKResponsiveSize, IBKIntent } from '../types/base';

interface ButtonCommonProps {
  children?: ReactNode;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  className?: string;
  intent?: IBKIntent;
  variant?: IBKVariants;
  size?: IBKSize | IBKResponsiveSize;
  block?: boolean;
  round?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export type ButtonNativeProps = ButtonCommonProps & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof ButtonCommonProps | 'style' | 'onClick'
> & {
  link?: undefined;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export type ButtonLinkProps = ButtonCommonProps & Omit<
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
