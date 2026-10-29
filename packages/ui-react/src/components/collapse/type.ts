import type { HTMLAttributes, ReactNode } from 'react';
import type { IconName } from '../icon';
import type { IBKSize, IBKResponsiveSize, IBKVariants } from '../types/base';

export interface CollapseIcons {
  /** 展开状态图标。 */
  open: IconName;
  /** 收起状态图标。 */
  close: IconName;
}

export interface CollapseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'defaultValue' | 'onChange'> {
  children: ReactNode;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  /** 只允许一个面板展开；value 和 defaultValue 包含多项时均只使用第一项。 */
  accordion?: boolean;
  disabled?: boolean;
  size?: IBKSize | IBKResponsiveSize;
  variant?: IBKVariants;
  /** 可分别覆盖展开和收起图标，未配置项使用默认图标。 */
  icons?: Partial<CollapseIcons>;
}

export interface CollapseItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'title'> {
  value: string;
  /** 标题位于原生 button 内，请勿嵌套交互元素。 */
  title: ReactNode;
  /** 标题语义层级，默认使用 h3。 */
  headerLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  disabled?: boolean;
  /** 收起时保留内容及其内部状态。 */
  keepMounted?: boolean;
}

/** 兼容原有命名。 */
export type ICollapseProps = CollapseProps;
export type ICollapseItemProps = CollapseItemProps;
