'use client';

import { Menu } from '@base-ui/react/menu';
import { forwardRef, useCallback } from 'react';
import type { HTMLAttributes } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { withoutStyle } from '../utils/styles';
import { getDropdownSizeStyle } from './size';
import type {
  DropdownMenuTriggerProps, DropdownMenuContentProps, DropdownMenuItemProps, DropdownMenuLabelProps,
  DropdownMenuSubTriggerProps, DropdownMenuCheckboxItemProps, DropdownMenuRadioItemProps,
} from './type';
import './index.css';

function classes<State>(base: string, className?: string | ((state: State) => string | undefined)) {
  return (state: State) => [base, typeof className === 'function' ? className(state) : className]
    .filter(Boolean).join(' ');
}

export const DropdownMenu = Menu.Root;
export const DropdownMenuPortal = Menu.Portal;
export const DropdownMenuSub = Menu.SubmenuRoot;

export const DropdownMenuTrigger = forwardRef<HTMLElement, DropdownMenuTriggerProps>(
  function DropdownMenuTrigger(props, ref) {
    // Base UI 的 Trigger 声明将原生 button ref 与可替换元素的 ref 相交；
    // 用接收 HTMLElement 的回调透传真实节点，同时保留 React 19 ref cleanup。
    const triggerRef = useCallback((node: HTMLElement | null) => {
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
    }, [ref]);
    return <Menu.Trigger data-slot="dropdown-menu-trigger" {...withoutStyle(props)} ref={triggerRef} />;
  },
);

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({
    size = 'base', side = 'bottom', align = 'start', sideOffset = 4, alignOffset = 0,
    collisionPadding = 8, className, portalProps, ...props
  }, ref) {
    return (
      <Menu.Portal {...portalProps}>
        <Menu.Positioner className="bkreact-dropdown-positioner"
          {...{ side, align, sideOffset, alignOffset, collisionPadding }}>
          <Menu.Popup
            data-slot="dropdown-menu-content"
            {...withoutStyle(props)}
            ref={ref}
            className={classes('bkreact-dropdown', className)}
            style={getDropdownSizeStyle(size)}
            {...getResponsiveSizeAttributes(size)}
            data-size={typeof size === 'string' ? size : 'responsive'}
          />
        </Menu.Positioner>
      </Menu.Portal>
    );
  },
);

export const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuSubContent({
    side = 'inline-end', align = 'start', alignOffset = -3, sideOffset = 0, className, ...props
  }, ref) {
    // 子菜单有独立 slot，复用 Content 的布局与定位实现。
    return <DropdownMenuContent data-slot="dropdown-menu-sub-content" {...props} ref={ref}
      {...{ side, align, alignOffset, sideOffset }}
      className={classes('bkreact-dropdown--sub', className)} />;
  },
);

export const DropdownMenuGroup = forwardRef<HTMLDivElement, Omit<Menu.Group.Props, 'style'>>(
  function DropdownMenuGroup(props, ref) {
    return <Menu.Group data-slot="dropdown-menu-group" {...withoutStyle(props)} ref={ref} />;
  },
);

export const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  function DropdownMenuLabel({ inset, className, ...props }, ref) {
    return <Menu.GroupLabel data-slot="dropdown-menu-label" {...withoutStyle(props)} ref={ref}
      data-inset={inset || undefined} className={classes('bkreact-dropdown__group-label', className)} />;
  },
);

export const DropdownMenuItem = forwardRef<HTMLElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ inset, variant = 'default', className, ...props }, ref) {
    return <Menu.Item data-slot="dropdown-menu-item" {...withoutStyle(props)} ref={ref}
      data-inset={inset || undefined} data-variant={variant}
      className={classes('bkreact-dropdown__item', className)} />;
  },
);

function Chevron() {
  return <svg className="bkreact-dropdown__arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="m6 4 4 4-4 4" />
  </svg>;
}

export const DropdownMenuSubTrigger = forwardRef<HTMLElement, DropdownMenuSubTriggerProps>(
  function DropdownMenuSubTrigger({ inset, children, className, ...props }, ref) {
    return <Menu.SubmenuTrigger data-slot="dropdown-menu-sub-trigger" {...withoutStyle(props)} ref={ref}
      data-inset={inset || undefined}
      className={classes('bkreact-dropdown__item', className)}>
      {children}<Chevron />
    </Menu.SubmenuTrigger>;
  },
);

function Check() {
  return <svg className="bkreact-dropdown__check" viewBox="0 0 16 16" aria-hidden="true">
    <path d="m3 8 3 3 7-7" />
  </svg>;
}

export const DropdownMenuCheckboxItem = forwardRef<HTMLElement, DropdownMenuCheckboxItemProps>(
  function DropdownMenuCheckboxItem({ inset, children, className, ...props }, ref) {
    return <Menu.CheckboxItem data-slot="dropdown-menu-checkbox-item" {...withoutStyle(props)} ref={ref}
      data-inset={inset || undefined}
      className={classes('bkreact-dropdown__item bkreact-dropdown__choice', className)}>
      {children}
      <Menu.CheckboxItemIndicator className="bkreact-dropdown__indicator"
        data-slot="dropdown-menu-checkbox-item-indicator"><Check /></Menu.CheckboxItemIndicator>
    </Menu.CheckboxItem>;
  },
);

export const DropdownMenuRadioGroup = forwardRef<HTMLDivElement, Omit<Menu.RadioGroup.Props, 'style'>>(
  function DropdownMenuRadioGroup(props, ref) {
    return <Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...withoutStyle(props)} ref={ref} />;
  },
);

export const DropdownMenuRadioItem = forwardRef<HTMLElement, DropdownMenuRadioItemProps>(
  function DropdownMenuRadioItem({ inset, children, className, ...props }, ref) {
    return <Menu.RadioItem data-slot="dropdown-menu-radio-item" {...withoutStyle(props)} ref={ref}
      data-inset={inset || undefined}
      className={classes('bkreact-dropdown__item bkreact-dropdown__choice', className)}>
      {children}
      <Menu.RadioItemIndicator className="bkreact-dropdown__indicator"
        data-slot="dropdown-menu-radio-item-indicator"><Check /></Menu.RadioItemIndicator>
    </Menu.RadioItem>;
  },
);

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, Omit<Menu.Separator.Props, 'style'>>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    return <Menu.Separator data-slot="dropdown-menu-separator" {...withoutStyle(props)} ref={ref}
      className={classes('bkreact-dropdown__separator', className)} />;
  },
);

export const DropdownMenuShortcut = forwardRef<HTMLSpanElement, Omit<HTMLAttributes<HTMLSpanElement>, 'style'>>(
  function DropdownMenuShortcut({ className, ...props }, ref) {
    return <span aria-hidden="true" data-slot="dropdown-menu-shortcut" {...withoutStyle(props)} ref={ref}
      className={['bkreact-dropdown__suffix', className].filter(Boolean).join(' ')} />;
  },
);
