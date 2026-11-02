import type { Menu } from '@base-ui/react/menu';
import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export interface IDropdownGroup {
  /** 动态增删或重排时应提供稳定 key。 */
  key?: string;
  label?: string;
  items: IDropdownItem[];
}

export interface IDropdownActionItem {
  type?: 'item';
  /** 动态增删或重排时应提供稳定 key。 */
  key?: string;
  children: ReactNode;
  /** 自定义复杂内容时用于键盘文字查找。 */
  label?: string;
  prefixIcon?: ReactNode;
  /** 视觉辅助内容，默认从无障碍名称中隐藏。 */
  suffix?: ReactNode;
  /** 快捷键语义，例如 Meta+E；组件不负责注册全局快捷键。 */
  'aria-keyshortcuts'?: string;
  inset?: boolean;
  disabled?: boolean;
  danger?: boolean;
  closeOnClick?: boolean;
  handler?: (event: MouseEvent<HTMLElement>, item: IDropdownActionItem) => void;
  /** 非空时作为子菜单触发项，handler 仅用于叶子项。 */
  items?: IDropdownItem[];
}

export interface IDropdownSeparatorItem {
  type: 'separator';
  /** 动态增删或重排时应提供稳定 key。 */
  key?: string;
}

export type IDropdownItem = IDropdownActionItem | IDropdownSeparatorItem;

/** 不接受内联 style；宽度等视觉覆盖通过 className，定位通过 side/offset 等属性。 */
export type DropdownContentProps = Omit<Menu.Popup.Props, 'style' | 'render'> &
  Pick<Menu.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding'>;

export type DropdownPortalOptions = Pick<Menu.Portal.Props, 'container' | 'keepMounted'>;

/** 组合式浮层与数据式 Dropdown 使用同一套尺寸。 */
export type DropdownMenuContentProps = DropdownContentProps & {
  /** 响应式对象必须显式提供 base；md 等断点的值须为七档尺寸之一。 */
  size?: IBKSize | IBKResponsiveSize;
  portalProps?: DropdownPortalOptions;
};
export type DropdownMenuLabelProps = Omit<Menu.GroupLabel.Props, 'style'> & { inset?: boolean };
export type DropdownMenuItemProps = Omit<Menu.Item.Props, 'style'> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};
export type DropdownMenuSubTriggerProps = Omit<Menu.SubmenuTrigger.Props, 'style'> & { inset?: boolean };
export type DropdownMenuCheckboxItemProps = Omit<Menu.CheckboxItem.Props, 'style'> & { inset?: boolean };
export type DropdownMenuRadioItemProps = Omit<Menu.RadioItem.Props, 'style'> & { inset?: boolean };

export interface IDropdownProps extends Pick<
  Menu.Root.Props,
  'open' | 'defaultOpen' | 'onOpenChange' | 'onOpenChangeComplete' | 'modal' | 'loopFocus'
> {
  /** 元素作为触发器复用（须透传 DOM props 和 ref）；文本会包在原生按钮中。 */
  trigger: ReactNode;
  groups: IDropdownGroup[];
  hover?: boolean;
  /** 根菜单和所有子菜单的 Portal 配置，默认挂载到 body。 */
  portalProps?: DropdownPortalOptions;
  /** 响应式对象必须显式提供 base，例如 { base: 'sm', md: 'lg' }。 */
  size?: IBKSize | IBKResponsiveSize;
  /** 根浮层类名；ref 同样指向根浮层。 */
  className?: string;
  triggerProps?: Omit<Menu.Trigger.Props, 'children' | 'render' | 'style' | 'handle' | 'payload'>;
  contentProps?: Omit<DropdownContentProps, 'children'>;
}

export type DropdownProps = IDropdownProps;

export type DropdownMenuProps = Menu.Root.Props;
export type DropdownMenuPortalProps = Menu.Portal.Props;
export type DropdownMenuTriggerProps = Omit<Menu.Trigger.Props, 'style' | 'ref'>;
export type DropdownMenuGroupProps = Omit<Menu.Group.Props, 'style'>;
export type DropdownMenuSubProps = Menu.SubmenuRoot.Props;
export type DropdownMenuSubContentProps = DropdownMenuContentProps;
export type DropdownMenuRadioGroupProps = Omit<Menu.RadioGroup.Props, 'style'>;
export type DropdownMenuSeparatorProps = Omit<Menu.Separator.Props, 'style'>;
export type DropdownMenuShortcutProps = Omit<HTMLAttributes<HTMLSpanElement>, 'style'>;
