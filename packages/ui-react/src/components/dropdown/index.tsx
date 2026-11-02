'use client';

import { forwardRef, Fragment, isValidElement } from 'react';
import { withoutStyle } from '../utils/styles';
import type { DropdownProps, DropdownPortalOptions, IDropdownItem } from './type';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuShortcut,
} from './base';

export * from './base';

export type * from './type';

function Items({ items, size, portalProps }: {
  items: IDropdownItem[];
  size: NonNullable<DropdownProps['size']>;
  portalProps?: DropdownPortalOptions;
}) {
  return items.map((item, index) => {
    const key = item.key ?? index;
    if (item.type === 'separator') return <DropdownMenuSeparator key={key} />;
    const nested = !!item.items?.length;
    const content = <>
      {item.prefixIcon != null && <span className="bkreact-dropdown__icon" aria-hidden="true">{item.prefixIcon}</span>}
      <span className="bkreact-dropdown__label">{item.children}</span>
      {item.suffix != null && <DropdownMenuShortcut>{item.suffix}</DropdownMenuShortcut>}
    </>;
    const props = { disabled: item.disabled, inset: item.inset, label: item.label, 'aria-keyshortcuts': item['aria-keyshortcuts'] };
    if (nested) return (
      <DropdownMenuSub key={key}>
        <DropdownMenuSubTrigger {...props}>{content}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent size={size} portalProps={portalProps}>
          <Items items={item.items!} size={size} portalProps={portalProps} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
    return <DropdownMenuItem {...props} key={key} closeOnClick={item.closeOnClick} variant={item.danger ? 'destructive' : 'default'}
      onClick={item.handler ? event => item.handler?.(event, item) : undefined}>{content}</DropdownMenuItem>;
  });
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(function Dropdown(
  { trigger, groups, hover = false, size = 'base', className, triggerProps, contentProps, portalProps, ...rootProps }, ref,
) {
  const renderTrigger = isValidElement(trigger) && trigger.type !== Fragment;
  const { className: contentClassName, ...popupProps } = contentProps ?? {};
  return (
    <DropdownMenu {...rootProps}>
      <DropdownMenuTrigger openOnHover={hover} {...withoutStyle(triggerProps ?? {})}
        render={renderTrigger ? trigger : undefined}>
        {renderTrigger ? undefined : trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent {...popupProps} ref={ref} size={size} portalProps={portalProps}
        className={state => [className, typeof contentClassName === 'function' ? contentClassName(state) : contentClassName].filter(Boolean).join(' ')}>
        {groups.map((group, index) => (
          <DropdownMenuGroup key={group.key ?? index}>
            {group.label != null && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
            <Items items={group.items} size={size} portalProps={portalProps} />
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default Dropdown;
