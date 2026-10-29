"use client"

import * as React from "react"

import { joinClassNames, withoutStyle } from "../utils"
import { registerSidebarShortcut } from "./keyboard-shortcut"
import { SidebarContext } from "./sidebar-context"
import { useIsMobile } from "./use-is-mobile"
import "./index.css"
import { readSidebarStateFromCookie, readUserHasSetFromCookie, writeSidebarState, writeUserHasSet } from "./utils"

import type { SidebarContextProps, SidebarProviderProps } from "./types"

// 每个 Provider 只读取一次客户端偏好；SSR/hydrate 首帧始终使用同一快照。
const subscribeCookies = () => () => {}
const serverPreferences = { open: true, userHasSet: false }
function useInitialCookiePreferences() {
  const initial = React.useRef<typeof serverPreferences | null>(null)
  const getSnapshot = React.useCallback(() => {
    initial.current ??= {
      open: readSidebarStateFromCookie() ?? true,
      userHasSet: readUserHasSetFromCookie() ?? false,
    }
    return initial.current
  }, [])
  return React.useSyncExternalStore(subscribeCookies, getSnapshot, () => serverPreferences)
}

export function SidebarProvider({
  defaultOpen,
  defaultUserHasSet,
  open: openProp,
  onOpenChange: setOpenProp,
  onUserOpenChange,
  keyboardShortcut = true,
  className,
  ref,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile()
  const [portalContainer, setPortalContainer] = React.useState<HTMLDivElement | null>(null)
  const handleWrapperRef = React.useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node)
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  const [enableTransition, setEnableTransition] = React.useState(false)
  const [openMobile, setOpenMobile] = React.useState(false)

  const isControlled = openProp !== undefined
  const cookiePreferences = useInitialCookiePreferences()
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open ?? cookiePreferences.open
  const [_userHasSet, setUserHasSet] = React.useState(defaultUserHasSet)
  const userHasSet = !isControlled && (_userHasSet ?? cookiePreferences.userHasSet)

  React.useEffect(() => {
    // 双 rAF 确保首帧已经绘制完成，再启用过渡
    let secondId = 0
    const id = requestAnimationFrame(() => {
      secondId = requestAnimationFrame(() => setEnableTransition(true))
    })
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(secondId) }
  }, [])

  // 统一 setter，不标记用户操作，供 AutoCollapseSidebar 等自动逻辑使用
  const setOpen = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (value) => {
      const next = typeof value === "function" ? value(open) : value
      if (openProp === undefined) _setOpen(next)
      setOpenProp?.(next)
    },
    [setOpenProp, open, openProp]
  )

  // 用户主动操作入口：先标记偏好，再改状态
  const setOpenByUser = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (value) => {
      const next =
        typeof value === "function"
          ? (value as (prev: boolean) => boolean)(open)
          : value
      if (!isControlled) setUserHasSet(true)
      onUserOpenChange?.(next)
      setOpen(next)
    },
    [isControlled, onUserOpenChange, open, setOpen]
  )

  // 仅当用户设置过偏好时才写 sidebar_state，
  // 避免自动折叠或初次挂载污染用户偏好。
  React.useEffect(() => {
    if (isControlled || !userHasSet) return
    writeSidebarState(open)
  }, [isControlled, open, userHasSet])

  // sidebar_user_set 只在 true 时写，语义更干净
  React.useEffect(() => {
    if (isControlled || !userHasSet) return
    writeUserHasSet()
  }, [isControlled, userHasSet])

  // toggle 走 setOpenByUser，标记为用户操作
  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((prev) => !prev)
      : setOpenByUser((prev) => !prev)
  }, [isMobile, setOpenByUser, setOpenMobile])

  // 一个 Document 只分发给一个 Provider；优先焦点所在的最内层 Provider。
  React.useEffect(() => {
    if (!keyboardShortcut || !portalContainer) return
    return registerSidebarShortcut(portalContainer, toggleSidebar)
  }, [keyboardShortcut, portalContainer, toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      portalContainer,
      state,
      open,
      setOpen,
      setOpenByUser,
      userHasSet,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [
      portalContainer,
      state,
      open,
      setOpen,
      setOpenByUser,
      userHasSet,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    ]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={handleWrapperRef}
        data-slot="sidebar-wrapper"
        data-transition={enableTransition ? "enabled" : "disabled"}
        className={joinClassNames("bkreact-sidebar", className)}
        {...withoutStyle(props)}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}
