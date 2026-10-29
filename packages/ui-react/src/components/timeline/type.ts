import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import type { IBKLayout, IBKSize, IBKResponsiveSize } from '../types/base';

export type TimelineAlign = 'start' | 'center';
export type TimelineStatus = 'pending' | 'current' | 'complete';

export type TimelineStyle = CSSProperties & { [key: `--timeline-${string}`]: string | number };

export type TimelineRootProps = Omit<ComponentPropsWithoutRef<'ol'>, 'style'> & {
  /**
   * 合并到尺寸变量之后，允许覆盖局部 tokens。
   * pending 的文字色优先使用 --timeline-step-pending-text-color；
   * 若需统一所有步骤的文字色，请同时覆盖它和 --timeline-step-text-color。
   */
  style?: TimelineStyle;
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

export type TimelineItemProps = ComponentPropsWithoutRef<'li'> & {
  /** 步进模式下的项目状态；current 自动设置 aria-current=step。 */
  status?: TimelineStatus;
  /** @deprecated 布局统一由 TimelineRoot.layout 控制；冲突值会被忽略。 */
  layout?: IBKLayout;
};

export type TimelineMarkerProps = ComponentPropsWithoutRef<'span'> & {
  /** 与 children 二选一，同时传入时 icon 优先。icon 强制视为装饰，语义请写入正文。 */
  icon?: ReactNode;
  /** 自定义整个标记，可组合圆点、步骤数字和文字；不限制为圆形。 */
  children?: ReactNode;
  /** @deprecated 仅横向布局可见；请通过 children 组合圆点和文字。 */
  label?: ReactNode;
};

export type TimelineContentProps = ComponentPropsWithoutRef<'div'>;

export type TimelineTimeProps = ComponentPropsWithoutRef<'time'>;

export type TimelineTitleProps = ComponentPropsWithoutRef<'h3'> & {
  /** 原生标题层级，默认 3。 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type TimelineDescriptionProps = ComponentPropsWithoutRef<'p'>;

export type TimelineActionProps = ComponentPropsWithoutRef<'div'>;
