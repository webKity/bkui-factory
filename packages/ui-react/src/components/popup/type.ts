import type { Dialog } from '@base-ui/react/dialog';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type PopupProps<Payload = unknown> = Dialog.Root.Props<Payload>;
export type PopupTriggerProps<Payload = unknown> = Omit<Dialog.Trigger.Props<Payload>, 'style'>;
export type PopupCloseProps = Omit<Dialog.Close.Props, 'style'>;
export type PopupSide = 'top' | 'right' | 'bottom' | 'left';
export type PopupContentProps = Omit<Dialog.Popup.Props, 'title' | 'style'> & {
  /**
   * 内容容器允许内联样式（包括 Base UI 状态回调），用于 sidebar 等组合组件注入动态 CSS tokens。
   * 这是其他 Popup 子组件之外的显式例外；常规外观优先使用 className / --popup-* tokens。
   */
  style?: Dialog.Popup.Props['style'];
  /** 默认 right。 */
  side?: PopupSide;
  /** 标题快捷方式；需要描述或复杂头部时，组合 PopupHeader、PopupTitle 和 PopupDescription。 */
  title?: ReactNode;
  /** 默认显示关闭按钮；隐藏后应提供 PopupClose。 */
  showCloseButton?: boolean;
  /** 关闭按钮的可访问名称，默认 'Close'；应用应传入当前语言文案。 */
  closeLabel?: string;
  portalContainer?: Dialog.Portal.Props['container'];
};
export type PopupHeaderProps = Omit<ComponentPropsWithoutRef<'div'>, 'style'>;
export type PopupFooterProps = PopupHeaderProps;
export type PopupTitleProps = Omit<Dialog.Title.Props, 'style'>;
export type PopupDescriptionProps = Omit<Dialog.Description.Props, 'style'>;
export type CreatePopupProps = Omit<PopupProps, 'children' | 'open' | 'defaultOpen'> & PopupContentProps;
export interface PopupInstanceHandle {
  /**
   * 请求打开仍存活的实例；关闭动画完成并移除后无效。
   * 关闭动画期间再次打开的过渡行为由 Base UI 管理，调用方不应依赖具体时序。
   */
  open: () => void;
  /**
   * 已提交时走 Dialog 关闭流程，onOpenChange 可通过 details.cancel() 取消。
   * 关闭动画完成后自动销毁，句柄失效；首次提交前调用则直接销毁，无关闭事件或动画。
   */
  close: () => void;
  /** 立即移除，跳过关闭动画。可重复调用。 */
  destroy: () => void;
}
