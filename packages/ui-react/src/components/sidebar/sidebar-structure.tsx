"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { Input } from "../input"
import { joinClassNames } from "../utils"

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={joinClassNames("bkreact-sidebar__inset", className)}
      {...props}
    />
  )
}

export function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={joinClassNames("bkreact-sidebar__input", className)}
      {...props}
    />
  )
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={joinClassNames("bkreact-sidebar__header", className)}
      {...props}
    />
  )
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={joinClassNames("bkreact-sidebar__footer", className)}
      {...props}
    />
  )
}

export function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={joinClassNames("bkreact-sidebar__separator", className)}
      {...props}
    />
  )
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={joinClassNames("bkreact-sidebar__content", className)}
      {...props}
    />
  )
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={joinClassNames("bkreact-sidebar__group", className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: joinClassNames("bkreact-sidebar__group-label", className),
      },
      props
    ),
    render,
    state: { slot: "sidebar-group-label", sidebar: "group-label" },
  })
}

export function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        className: joinClassNames("bkreact-sidebar__group-action", className),
      },
      props
    ),
    render,
    state: { slot: "sidebar-group-action", sidebar: "group-action" },
  })
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={joinClassNames("bkreact-sidebar__group-content", className)}
      {...props}
    />
  )
}
