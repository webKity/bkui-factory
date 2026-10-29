import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
  ReactNode,
} from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

interface TypographyOwnProps<T extends ElementType> {
  as?: T;
  className?: string;
  children?: ReactNode;
  /** 字符串选择全局尺寸；响应式对象必须提供 base，可选断点仅在显式配置时生效。 */
  size?: IBKSize | IBKResponsiveSize;
  /** 保留文本中的换行符，默认关闭。 */
  preLine?: boolean;
}

/** 原生属性及事件类型随 as 变化，默认渲染 div。 */
export type TypographyProps<T extends ElementType = 'div'> = TypographyOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TypographyOwnProps<T> | 'style'>;

export interface TypographyComponent {
  <T extends ElementType = 'div'>(
    props: TypographyProps<T> & {
      ref?: ComponentPropsWithRef<T>['ref'];
    },
  ): ReactElement | null;
}
