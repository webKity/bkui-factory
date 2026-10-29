import type { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export type TooltipProviderProps = BaseTooltip.Provider.Props;

export type TooltipSide = NonNullable<BaseTooltip.Positioner.Props['side']>;

export type TooltipAlign = NonNullable<BaseTooltip.Positioner.Props['align']>;

export interface TooltipProps
  extends Pick<
      BaseTooltip.Root.Props,
      | 'open'
      | 'defaultOpen'
      | 'onOpenChange'
      | 'onOpenChangeComplete'
      | 'disabled'
      | 'disableHoverablePopup'
    >,
    Pick<BaseTooltip.Positioner.Props, 'side' | 'align' | 'alignOffset' | 'collisionPadding'>,
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'content' | 'style' | 'title'> {
  /** 与触发元素的间距；带箭头默认 8，无箭头默认 4，显式设置优先。 */
  sideOffset?: BaseTooltip.Positioner.Props['sideOffset'];
  /** 单个可聚焦触发元素；须提供可访问名称，避免设置原生 title；自定义组件须透传 DOM props 和 ref。 */
  children: ReactElement;
  /** 提示内容；不应包含按钮、链接等交互控件。 */
  content: ReactNode;
  /** 默认 sm；支持七档尺寸；响应式对象必须提供 base，如 { base: 'sm', md: 'lg' }。 */
  size?: IBKSize | IBKResponsiveSize;
  /** 默认显示箭头。 */
  arrow?: boolean;
  /** 悬停打开延时（毫秒）；未设置时沿用 Provider，默认 200。 */
  delay?: number;
  /** 离开触发器后的关闭延时（毫秒）；未设置时沿用 Provider，默认 0。 */
  closeDelay?: number;
  /** 触发元素的属性与事件；children 的原有属性由 Base UI 合并。 */
  triggerProps?: Omit<
    BaseTooltip.Trigger.Props,
    'style' | 'render' | 'children' | 'handle' | 'payload' | 'delay' | 'closeDelay' | 'disabled'
  >;
}
