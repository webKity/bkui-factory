"use client"

import "./index.css"

export { SidebarProvider } from "./sidebar-provider"
export { Sidebar } from "./sidebar"
export { SidebarTrigger, SidebarRail } from "./sidebar-trigger"
export {
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
} from "./sidebar-structure"
export {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "./sidebar-menu"
export { useSidebar } from "./sidebar-context"

export type {
  SidebarCollapsible,
  SidebarContextProps,
  SidebarMenuActionProps,
  SidebarMenuButtonProps,
  SidebarMenuSubButtonProps,
  SidebarProviderProps,
  SidebarProps,
  SidebarSide,
  SidebarVariant,
} from "./types"
export type { SidebarTokens } from "./types"
