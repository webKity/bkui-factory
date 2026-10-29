"use client"

import * as React from "react"

import { Button } from "../button"
import type { ButtonNativeProps } from "../button"
import { BKIcon } from "../icon"
import { joinClassNames } from "../utils"
import { useSidebar } from "./sidebar-context"

export function SidebarTrigger({
  className,
  onClick,
  children = <BKIcon name="sidebar" />,
  "aria-label": ariaLabel = "Toggle Sidebar",
  ...props
}: ButtonNativeProps) {
  const { toggleSidebar, isMobile, openMobile, open } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="2xs"
      className={joinClassNames("bkreact-sidebar__trigger", className)}
      aria-label={ariaLabel}
      aria-expanded={isMobile ? openMobile : open}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) toggleSidebar()
      }}
      {...props}
    >
      {children}
    </Button>
  )
}

export function SidebarRail({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-hidden="true"
      tabIndex={-1}
      type="button"
      onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) toggleSidebar() }}
      title="Toggle Sidebar"
      className={joinClassNames("bkreact-sidebar__rail", className)}
      {...props}
    />
  )
}