'use client';

import { joinClassNames } from '../utils';
import { Popup, PopupContent, PopupDescription, PopupHeader, PopupTitle } from '../popup';
import { useSidebar } from './sidebar-context';
import type { SidebarProps } from './types';
import './index.css';

export function Sidebar({
  collapsible = 'offcanvas', variant = 'sidebar', side = 'left',
  className, children, dir, style, ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile, portalContainer } = useSidebar();

  if (collapsible === 'none') {
    return <div {...props} style={style} dir={dir} data-slot="sidebar" data-variant={variant} data-side={side}
      data-collapsible="none" className={joinClassNames('bkreact-sidebar__static', className)}>{children}</div>;
  }

  if (isMobile) {
    return (
      <Popup open={openMobile} onOpenChange={setOpenMobile}>
        <PopupContent {...props} dir={dir} data-sidebar="sidebar" data-slot="sidebar"
          data-variant={variant} data-side={side} data-mobile="true" side={side}
          showCloseButton={false} portalContainer={portalContainer} style={style}
          className={joinClassNames('bkreact-sidebar__mobile', className)}>
          <PopupHeader className="bkreact-sidebar__sr-only">
            <PopupTitle>Sidebar</PopupTitle>
            <PopupDescription>Displays the mobile sidebar.</PopupDescription>
          </PopupHeader>
          <div className="bkreact-sidebar__inner">{children}</div>
        </PopupContent>
      </Popup>
    );
  }

  return (
    <div className="bkreact-sidebar__root" dir={dir} data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant} data-side={side} data-slot="sidebar">
      <div data-slot="sidebar-gap" className="bkreact-sidebar__gap" />
      <div {...props} style={style} data-slot="sidebar-container" data-side={side}
        className={joinClassNames('bkreact-sidebar__container', className)}>
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className="bkreact-sidebar__inner">{children}</div>
      </div>
    </div>
  );
}
