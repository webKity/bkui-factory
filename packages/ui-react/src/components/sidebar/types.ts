import type * as React from "react"
import type { useRender } from "@base-ui/react/use-render"
import type { TooltipProps } from "../tooltip"

export type SidebarVariant = "sidebar" | "floating" | "inset"
export type SidebarSide = "left" | "right"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"

export type SidebarContextProps = {
  /** 移动端 Portal 挂载到 Provider 内，继承其主题和自定义 tokens。 */
  portalContainer: HTMLDivElement | null
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  /** 用户主动操作入口：非受控模式下会把 userHasSet 标记为 true。 */
  setOpenByUser: React.Dispatch<React.SetStateAction<boolean>>
  /** 用户是否手动设置过偏好 */
  userHasSet: boolean
  openMobile: boolean
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>
  isMobile: boolean
  toggleSidebar: () => void
}

export type SidebarProviderProps = Omit<React.ComponentProps<"div">, "style"> & {
  /** SSR 可传入 cookie 值避免 hydrate 后状态调整；缺省服务端快照为 true。 */
  defaultOpen?: boolean
  /** SSR 传入：用户是否手动设置过偏好 */
  defaultUserHasSet?: boolean
  /** 受控模式不读取 cookie 作为状态，也不保存偏好。 */
  open?: boolean
  /** 默认启用 Ctrl/Cmd+B；可关闭，多个 Provider 时优先焦点所在的最内层。 */
  keyboardShortcut?: boolean
  onOpenChange?: (open: boolean) => void
  /** 用户主动切换侧栏时触发，自动展开/收起不会触发 */
  onUserOpenChange?: (open: boolean) => void
}

export type SidebarProps = Omit<React.ComponentProps<"div">, "style"> & {
  collapsible?: SidebarCollapsible
  variant?: SidebarVariant
  side?: SidebarSide
}

export type SidebarMenuButtonProps = Omit<useRender.ComponentProps<"button">, "style"> & {
    isActive?: boolean
    tooltip?: string | Omit<TooltipProps, "children" | "content"> & { children?: React.ReactNode }
  }

export type SidebarMenuActionProps = Omit<useRender.ComponentProps<"button">, "style"> & {
    showOnHover?: boolean
  }

/** 默认链接需要 href；执行操作时请用 render={<button type="button" />}。 */
export type SidebarMenuSubButtonProps = Omit<useRender.ComponentProps<"a">, "style"> & {
    isActive?: boolean
  }
