import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BKIcon } from '../icon';
import {
  Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarRail,
} from './index';
import type { SidebarProps, SidebarProviderProps, SidebarTokens } from './types';

type SidebarExampleProps = SidebarProps & Pick<SidebarProviderProps,
  'defaultOpen' | 'defaultUserHasSet' | 'open' | 'onOpenChange' | 'onUserOpenChange' | 'keyboardShortcut'
>;

function Example({
  tokens, defaultOpen = true, defaultUserHasSet = false,
  open, onOpenChange, onUserOpenChange, keyboardShortcut = true, ...props
}: SidebarExampleProps & { tokens?: SidebarTokens }) {
  return (
    <SidebarProvider
      key={`${defaultOpen}-${defaultUserHasSet}`}
      defaultOpen={defaultOpen} defaultUserHasSet={defaultUserHasSet}
      open={open} onOpenChange={onOpenChange} onUserOpenChange={onUserOpenChange}
      keyboardShortcut={keyboardShortcut} style={tokens}
    >
      <Sidebar {...props}>
        <SidebarHeader><SidebarTrigger /></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {['Overview', 'Projects', 'Settings'].map((label, index) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton isActive={index === 0} tooltip={label}>
                    <BKIcon name="sidebar" /><span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Workspace">
                <BKIcon name="sidebar" /><span>Workspace</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset><SidebarTrigger /><p>Sidebar content</p></SidebarInset>
    </SidebarProvider>
  );
}

const meta = {
  title: '组件/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  args: {
    collapsible: 'icon', variant: 'sidebar', side: 'left',
    defaultOpen: true, defaultUserHasSet: false, keyboardShortcut: true,
  },
  argTypes: {
    collapsible: {
      control: 'inline-radio', options: ['icon', 'offcanvas', 'none'],
      description: '收起方式：保留图标、完全隐藏或固定展开；组件默认 offcanvas。',
    },
    variant: {
      control: 'inline-radio', options: ['sidebar', 'floating', 'inset'],
      description: '视觉布局；inset 搭配 SidebarInset 使用，默认 sidebar。',
    },
    side: { control: 'inline-radio', options: ['left', 'right'], description: '显示方向；移动端传递给 Popup，默认 left。' },
    children: { control: false, description: '组合 Header、Content、Footer 和菜单内容。' },
    className: { control: 'text', description: '侧栏容器的自定义类名。' },
    style: { control: false, description: '侧栏局部样式；统一配置尺寸及主题 tokens 时使用 SidebarProvider.style。' },
    defaultOpen: {
      control: 'boolean', description: 'Provider 的初始展开状态；未指定时读取 cookie，缺省展开。示例切换此项会重新挂载 Provider。',
      table: { category: 'SidebarProvider' },
    },
    defaultUserHasSet: {
      control: 'boolean', description: 'Provider 的初始用户偏好标记；SSR 可从 cookie 注入。',
      table: { category: 'SidebarProvider' },
    },
    open: {
      control: false, description: 'Provider 的受控展开状态；传入后不保存偏好 cookie。',
      table: { category: 'SidebarProvider' },
    },
    onOpenChange: {
      control: false, description: 'Provider 的展开状态变更请求；受控模式由父组件回写 open。',
      table: { category: 'SidebarProvider' },
    },
    onUserOpenChange: {
      control: false, description: '只在桌面用户主动操作时通知，自动折叠不会触发。',
      table: { category: 'SidebarProvider' },
    },
    keyboardShortcut: {
      control: 'boolean', description: 'Provider 是否启用 Ctrl/Cmd+B，默认 true。多个 Provider 优先响应焦点所在的最内层。',
      table: { category: 'SidebarProvider' },
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '可组合的侧边导航，支持图标收起、完全隐藏、浮动和内嵌布局，移动端通过 Popup 展示。样式消费局部 --sidebar-* tokens；顶部工具栏可切换主题，Controls 可实时调整示例。',
      },
      story: { inline: false, height: '480px' },
    },
  },
  render: args => <Example {...args} />,
} satisfies Meta<SidebarExampleProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  name: '可调试用例',
  parameters: { docs: {
    description: { story: 'Sidebar 必须放在 SidebarProvider 内。SidebarTrigger 切换展开状态，SidebarInset 承载主体内容。菜单文字放在最后一个直接子级 span 中，收起时隐藏；tooltip 为图标提供补充说明。' },
    source: { code: `<SidebarProvider defaultOpen defaultUserHasSet={false}>
  <Sidebar collapsible="icon">
    <SidebarHeader><SidebarTrigger /></SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Overview">
              <BKIcon name="sidebar" /><span>Overview</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset><SidebarTrigger /><p>Sidebar content</p></SidebarInset>
</SidebarProvider>` },
  } },
};
export const Collapsed: Story = {
  name: '图标收起',
  parameters: { docs: { description: { story: 'collapsible="icon" 时保留居中的菜单图标，隐藏文字和子菜单。SidebarTrigger 提供键盘入口；Rail 只供指针点击。' } } },
  render: args => <Example {...args} defaultOpen={false} />,
};
export const Offcanvas: Story = { name: '完全隐藏', args: { collapsible: 'offcanvas' }, parameters: { docs: { description: { story: 'collapsible="offcanvas" 会隐藏整个侧栏并释放占位空间；通过主体内容中的 SidebarTrigger 重新打开。' } } } };
export const Right: Story = { name: '右侧导航', args: { side: 'right' } };
export const Floating: Story = { name: '浮动布局', args: { variant: 'floating' } };
export const FloatingCollapsed: Story = {
  name: '浮动布局收起态',
  args: { variant: 'floating' },
  render: args => <Example {...args} defaultOpen={false} />,
};
export const Inset: Story = { name: '内嵌布局', args: { variant: 'inset' }, parameters: { docs: { description: { story: 'variant="inset" 搭配 SidebarInset，为主体内容添加间距、圆角和阴影。' } } } };
const customTokens: SidebarTokens = {
  '--sidebar-width': '19rem',
  '--sidebar-width-icon': '4.5rem',
  '--sidebar-width-mobile': '21rem',
  '--sidebar-menu-radius': '16px',
  '--sidebar-menu-padding-y': '12px',
  '--sidebar-menu-gap': '12px',
  '--sidebar-bg': 'var(--color-fill-subtle)',
  '--sidebar-menu-active-bg': 'var(--color-fill-active)',
  '--sidebar-transition-duration-ms': 280,
};
export const CustomTokens: Story = {
  name: '自定义 Tokens',
  parameters: { docs: {
    description: { story: '在 SidebarProvider.style 中覆盖 --sidebar-*，即可定制展开/收起宽度、菜单圆角、间距和颜色。移动端 Portal 挂在 Provider 内，继承相同 tokens。' },
    source: { code: `<SidebarProvider style={{
  '--sidebar-width': '19rem',
  '--sidebar-width-icon': '4.5rem',
  '--sidebar-width-mobile': '21rem',
  '--sidebar-menu-radius': '16px',
  '--sidebar-menu-padding-y': '12px',
  '--sidebar-menu-gap': '12px',
  '--sidebar-bg': 'var(--color-fill-subtle)',
  '--sidebar-menu-active-bg': 'var(--color-fill-active)',
  '--sidebar-transition-duration-ms': 280,
}}>
  {/* 组合 Sidebar 和 SidebarInset */}
</SidebarProvider>` },
  } },
  render: args => <Example {...args} tokens={customTokens} />,
};
export const CustomTokensCollapsed: Story = {
  name: '自定义宽度收起态',
  render: args => <Example {...args} defaultOpen={false} tokens={customTokens} />,
};

export const Controlled: Story = {
  name: '受控状态',
  parameters: { docs: {
    description: { story: 'open 与 onOpenChange 传给 Provider，由父组件控制桌面展开状态。受控模式不写 sidebar_state / sidebar_user_set，也不标记用户偏好。移动端开关独立管理。' },
    source: { code: `const [open, setOpen] = useState(true);

<SidebarProvider open={open} onOpenChange={setOpen}>
  {/* 组合 Sidebar、SidebarTrigger 和 SidebarInset */}
</SidebarProvider>` },
  } },
  render: function ControlledExample(args) {
    const [open, setOpen] = useState(true);
    return <Example {...args} open={open} onOpenChange={setOpen} />;
  },
};

export const ServerDefaults: Story = {
  name: 'SSR 初始状态',
  args: { defaultOpen: false, defaultUserHasSet: true },
  parameters: { docs: {
    description: { story: '服务端可读取 cookie，并为服务端和客户端传入相同的 defaultOpen / defaultUserHasSet，避免首帧状态调整。未传时，SSR 和 hydrate 首帧固定展开，hydrate 后同步 cookie，不产生 hydration mismatch。非受控桌面用户操作会保存七天偏好；损坏 cookie 按缺失处理。' },
    source: { code: `<SidebarProvider
  defaultOpen={sidebarStateCookie !== 'false'}
  defaultUserHasSet={sidebarUserSetCookie === 'true'}
>
  {/* 组合 Sidebar 和 SidebarInset */}
</SidebarProvider>` },
  } },
};

export const WithoutShortcut: Story = {
  name: '关闭快捷键',
  args: { keyboardShortcut: false },
  parameters: { docs: { description: { story: 'keyboardShortcut=false 关闭 Ctrl/Cmd+B。默认每次按键只切换焦点所在的最内层启用 Provider；焦点在外部时使用文档顺序中的第一个。已取消的事件和自动重复按键不触发切换。' } } },
};
