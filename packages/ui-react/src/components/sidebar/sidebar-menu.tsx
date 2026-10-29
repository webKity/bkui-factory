"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { Tooltip } from "../tooltip"
import { joinClassNames } from "../utils"
import { useSidebar } from "./sidebar-context"
import type {
  SidebarMenuActionProps,
  SidebarMenuButtonProps,
  SidebarMenuSubButtonProps,
} from "./types"

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={joinClassNames("bkreact-sidebar__menu", className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={joinClassNames("bkreact-sidebar__menu-item", className)}
      {...props}
    />
  )
}

export function SidebarMenuButton({
  render,
  isActive = false,
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const { isMobile, state } = useSidebar()

  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-current": isActive ? "page" : undefined,
        className: joinClassNames("bkreact-sidebar__menu-button", className),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      active: isActive,
    },
  })

  if (!tooltip) return comp

  const tooltipProps =
    typeof tooltip === "string" ? { children: tooltip } : tooltip

  const { children: tooltipContent, ...tooltipRest } = tooltipProps

  return (
    <Tooltip
      side="right"
      align="center"
      disabled={state !== "collapsed" || isMobile}
      {...tooltipRest}
      content={tooltipContent}
    >
      {comp}
    </Tooltip>
  )
}

export function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: SidebarMenuActionProps) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        className: joinClassNames("bkreact-sidebar__menu-action", className),
      },
      props
    ),
    render,
    state: { slot: "sidebar-menu-action", sidebar: "menu-action", "show-on-hover": showOnHover },
  })
}

export function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={joinClassNames("bkreact-sidebar__menu-sub", className)}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={joinClassNames("bkreact-sidebar__menu-sub-item", className)}
      {...props}
    />
  )
}

export function SidebarMenuSubButton({
  render,
  isActive = false,
  className,
  ...props
}: SidebarMenuSubButtonProps) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        "aria-current": isActive ? "page" : undefined,
        className: joinClassNames("bkreact-sidebar__menu-sub-button", className),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      active: isActive,
    },
  })
}