"use client"

import * as React from "react"
import type { SidebarContextProps } from "./types"

export const SidebarContext =
  React.createContext<SidebarContextProps | null>(null)

export function useSidebar(): SidebarContextProps {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return ctx
}