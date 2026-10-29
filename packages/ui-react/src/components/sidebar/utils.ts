import Cookies from "../jscookie"

import { SIDEBAR_COOKIE_EXPIRES_DAYS, SIDEBAR_COOKIE_NAME, SIDEBAR_USER_SET_COOKIE_NAME } from "./constants"

/**
 * 读 cookie。SSR 下库内部直接返回 undefined，无需判断 document。
 * 值缺失时返回 undefined，让调用方决定 fallback。
 */
export function readSidebarStateFromCookie(): boolean | undefined {
  const value = Cookies.get(SIDEBAR_COOKIE_NAME)
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

export function readUserHasSetFromCookie(): boolean | undefined {
  const value = Cookies.get(SIDEBAR_USER_SET_COOKIE_NAME)
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/** 写入侧栏状态。SSR 下库内部跳过。 */
export function writeSidebarState(open: boolean): void {
  Cookies.set(SIDEBAR_COOKIE_NAME, String(open), {
    expires: SIDEBAR_COOKIE_EXPIRES_DAYS,
    path: "/",
    sameSite: "lax",
  })
}

/**
 * 写入用户偏好标记。
 * 只在 true 时调用，未设置过偏好的用户不会留下这个 cookie。
 */
export function writeUserHasSet(): void {
  Cookies.set(SIDEBAR_USER_SET_COOKIE_NAME, "true", {
    expires: SIDEBAR_COOKIE_EXPIRES_DAYS,
    path: "/",
    sameSite: "lax",
  })
}