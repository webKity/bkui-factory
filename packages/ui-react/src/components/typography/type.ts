import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export interface TypographyProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: ElementType;
  children?: ReactNode;
  size?: IBKSize | IBKResponsiveSize;
  /** 保留文本中的换行符，默认关闭。 */
  preLine?: boolean;
}
