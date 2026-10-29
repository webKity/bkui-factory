# Sidebar

Sidebar 的 TSX 负责交互和结构，`source/components/sidebar.tokens.json` 提供设计值，`tokens.css` 负责 Web 映射，`styles.css` 消费 `--sidebar-*`。运行 `npm run tokens:build` 更新设计 token 产物。

```tsx
import {
  Sidebar, SidebarProvider, SidebarTrigger, SidebarContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@bkreact/ui/client';

<SidebarProvider style={{ '--sidebar-width': '19rem', '--sidebar-width-mobile': '21rem' }}>
  <Sidebar collapsible="icon">
    <SidebarTrigger />
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive tooltip="Overview">
            <svg aria-hidden="true" /><span>Overview</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  </Sidebar>
</SidebarProvider>
```

移动端通过 Popup 显示侧栏；Portal 挂在 Provider 内，因此 Provider 上的主题、自定义 className 和 CSS tokens 会传递到弹层。菜单文字建议放在最后一个直接子级 `span` 内，供 icon 折叠状态收起文字。

## 状态与持久化

传入 `open` 即为受控模式：`onOpenChange` 请求父组件更新状态，`onUserOpenChange` 只通知用户操作。受控模式不以 cookie 决定状态、不标记 `userHasSet`、不写偏好 cookie，即使父组件拒绝这次更新也不会持久化。

非受控模式下，`defaultOpen` / `defaultUserHasSet` 优先于挂载时读取的 cookie。缺省为展开、无用户偏好；损坏的 cookie 按缺失处理。桌面用户操作会保存七天偏好，移动端开关和初次自动折叠不标记用户偏好。`setOpen` 供自动逻辑使用；`setOpenByUser` 供用户主动操作使用。

SSR 未传 default 值时，服务端及 hydrate 首帧固定为展开、无用户偏好，hydrate 后再同步客户端 cookie。这样不会产生 hydration mismatch，但 cookie 表示折叠时会有一次状态调整；需要首帧直接匹配用户偏好时，在服务端读取 cookie 并将相同的 `defaultOpen` / `defaultUserHasSet` 传给客户端。显式传入的初始值不再被 cookie 覆盖。

## 快捷键与可访问性

`keyboardShortcut` 默认 `true`，设为 `false` 可关闭 Ctrl/Cmd+B。每次按键只分发给焦点所在的最内层启用 Provider；焦点不在任一 Provider 内时，分发给文档顺序中的第一个启用 Provider。已经取消的事件、自动重复按键不会触发切换。

SidebarTrigger 提供键盘和屏幕阅读器入口；SidebarRail 是只供指针点击的辅助区域，从辅助技术导航中隐藏。移动端 Popup 支持 Escape 关闭和关闭后恢复焦点。

SidebarMenuSubButton 默认渲染链接，传入 `href` 才具有原生链接焦点语义。执行操作时用 `render={<button type="button" />}` 渲染按钮。

## 样式兼容

`data-active` 和 `data-show-on-hover` 通过 Base UI state 映射：true 输出空属性，false 省略属性，测试覆盖 true/false 切换。

支持 `:has()` 时，inset 背景和菜单操作留白按内容精确设置。不支持时，Provider 使用侧栏背景，所有菜单按钮预留操作区域，避免内容与操作按钮重叠；降级模式的空菜单按钮会多一些右侧留白。媒体查询在每个 Window 中复用一个 MediaQueryList，卸载时清理监听。
