import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { IBKLayout, IBKSize, IBKResponsiveSize } from '../types/base';

export type TimelineAlign = 'start' | 'center';
export type TimelineStatus = 'pending' | 'current' | 'complete';

export type TimelineRootProps = Omit<ComponentPropsWithoutRef<'ol'>, 'style'> & {
  /** 默认纵向；横向按项目平均分配宽度。 */
  layout?: IBKLayout;
  /** 横向布局的标记和内容对齐方式，默认 start。 */
  align?: TimelineAlign;
  size?: IBKSize | IBKResponsiveSize;
};

export type TimelineProps = TimelineRootProps;

export type TimelineContextValue = {
  layout: IBKLayout;
  align: TimelineAlign;
};

export type TimelineItemProps = Omit<ComponentPropsWithoutRef<'li'>, 'style'> & {
  /** 步进模式下的项目状态；current 自动设置 aria-current=step。 */
  status?: TimelineStatus;
  /** @deprecated 布局统一由 TimelineRoot.layout 控制；冲突值会被忽略。 */
  layout?: IBKLayout;
};

export type TimelineMarkerProps = Omit<ComponentPropsWithoutRef<'span'>, 'style'> & {
  /** 与 children 二选一，同时传入时 icon 优先。icon 强制视为装饰，语义请写入正文。 */
  icon?: ReactNode;
  /** 自定义整个标记，可组合圆点、步骤数字和文字；不限制为圆形。 */
  children?: ReactNode;
  /** @deprecated 仅横向布局可见；请通过 children 组合圆点和文字。 */
  label?: ReactNode;
};

export type TimelineContentProps = Omit<ComponentPropsWithoutRef<'div'>, 'style'>;

export type TimelineTimeProps = Omit<ComponentPropsWithoutRef<'time'>, 'style'>;

export type TimelineTitleProps = Omit<ComponentPropsWithoutRef<'h3'>, 'style'> & {
  /** 原生标题层级，默认 3。 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type TimelineDescriptionProps = Omit<ComponentPropsWithoutRef<'p'>, 'style'>;

export type TimelineActionProps = Omit<ComponentPropsWithoutRef<'div'>, 'style'>;
