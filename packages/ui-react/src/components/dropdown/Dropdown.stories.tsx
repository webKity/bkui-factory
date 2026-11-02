import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Dropdown, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from './index';
import { Button } from '../button';
import type { DropdownProps } from './type';
import { sizeBreakpoints, sizeBreakpointMinWidths } from '../utils/size';

const groups: DropdownProps['groups'] = [
  { label: '文件操作', items: [
    { children: '编辑', suffix: '⌘ E', 'aria-keyshortcuts': 'Meta+E' },
    { children: '复制' },
    { children: '移动到', items: [
      { children: '工作区' },
      { children: '更多', items: [{ children: '归档' }] },
    ] },
    { children: '下载', disabled: true },
    { type: 'separator' },
    { children: '删除', danger: true },
  ] },
];

const meta = {
  title: '组件/Dropdown', component: Dropdown, tags: ['autodocs'],
  args: { trigger: <Button>更多操作 ▾</Button>, groups, size: 'base', hover: false },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    trigger: { control: false }, groups: { control: false },
  },
  parameters: { docs: { description: { component:
    '基于 Base UI Menu 的数据驱动下拉菜单。trigger 元素会被复用，须透传 DOM props 和 ref；文本触发器使用原生按钮。groups 支持分组、分隔线和递归 items 子菜单。handler 用于叶子项，默认选择后关闭；closeOnClick=false 可保持打开。className 和 ref 指向根浮层，contentProps 控制定位及浮层事件。size 支持七档和响应式对象，必须提供 base（如 { base: "sm", md: "lg" }），子菜单沿用尺寸。宽度和视觉覆盖使用 className，不接受内联 style。portalProps.container 同时控制根菜单和子菜单的挂载容器；Content 自带 Portal，无需额外包裹 DropdownMenuPortal。快捷键提示默认 aria-hidden，实际快捷键用菜单项的 aria-keyshortcuts 标注，并由应用注册。动态增删或重排的分组、菜单项需提供稳定 key。' } } },
} satisfies Meta<typeof Dropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: '默认用例' };
export const Hover: Story = { name: '悬停触发', args: { hover: true, triggerProps: { delay: 150, closeDelay: 100 } } };
export const Disabled: Story = { name: '禁用状态', args: { triggerProps: { disabled: true } } };
export const Placement: Story = { name: '弹出位置', args: { contentProps: { side: 'right', align: 'start', sideOffset: 8 } } };
// 在真实浏览器中检查当前视口下的实际字号及 item 高度；切换视口后可重跑交互。
const verifyResponsiveSize: NonNullable<Story['play']> = async ({ canvasElement, args }) => {
  const document = canvasElement.ownerDocument;
  const window = document.defaultView!;
  await userEvent.click(within(canvasElement).getByRole('button'));
  const menu = await within(document.body).findByRole('menu');
  const size = args.size ?? 'base';
  let expected = typeof size === 'string' ? size : size.base;
  if (typeof size !== 'string') {
    for (const scope of sizeBreakpoints) {
      if (size[scope] && window.matchMedia(`(min-width: ${sizeBreakpointMinWidths[scope]}rem)`).matches) {
        expected = size[scope]!;
      }
    }
  }
  await waitFor(() => {
    const computed = window.getComputedStyle(menu);
    expect(computed.fontSize).toBe(computed.getPropertyValue(`--dropdown-size-${expected}-font-size`).trim());
    const item = within(menu).getAllByRole('menuitem')[0];
    expect(window.getComputedStyle(item).minHeight).toBe(computed.getPropertyValue(`--dropdown-size-${expected}-height`).trim());
    expect(window.getComputedStyle(item).borderRadius).toBe(computed.getPropertyValue(`--dropdown-size-${expected}-item-radius`).trim());
  });
  await userEvent.keyboard('{Escape}');
};
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'base', xl: 'lg' } }, play: verifyResponsiveSize,
};
export const ResponsiveBaseOnly: Story = {
  name: '仅基础断点',
  args: { size: { base: 'sm' } }, play: verifyResponsiveSize,
};
export const Sizes: Story = { name: '七档尺寸', render: args => <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
  {(['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map(size =>
    <Dropdown {...args} key={size} size={size} trigger={<Button size={size}>{size} ▾</Button>} />)}
</div> };
export const Controlled: Story = { name: '受控状态', render: function Example(args) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('尚未选择');
  return <div>
    <Dropdown {...args} open={open} onOpenChange={setOpen} groups={[{ items: [
      { children: '编辑', handler: () => setAction('编辑') },
      { children: '保持菜单打开', closeOnClick: false, handler: () => setAction('继续操作') },
    ] }]} />
    <p role="status">{action} · {open ? '打开' : '关闭'}</p>
  </div>;
} };
export const Keyboard: Story = {
  name: '键盘操作',
  args: { trigger: <Button>键盘操作</Button>, groups: [{ items: [
    { children: '编辑' }, { children: '禁用', disabled: true }, { children: '复制' },
  ] }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: '键盘操作' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(body.getByRole('menu')).toBeVisible();
    await waitFor(() => expect(body.getByRole('menuitem', { name: '编辑' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** 组合式 API：复用数据式 Dropdown 的样式、键盘交互和定位。 */
export const Composed: Story = { name: '组合用法', render: function Example(args) {
  const [checked, setChecked] = useState(true);
  const [sort, setSort] = useState('time');
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button>视图设置 ▾</Button>} />
    <DropdownMenuContent size={args.size}>
      <DropdownMenuGroup>
        <DropdownMenuLabel>显示设置</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
          显示工具栏
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem disabled>显示高级工具</DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenuLabel>排序方式</DropdownMenuLabel>
        <DropdownMenuRadioItem value="time">按时间</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="name">按名称</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>更多操作</DropdownMenuSubTrigger>
        <DropdownMenuSubContent size={args.size}>
          <DropdownMenuItem aria-keyshortcuts="Meta+E">导出<DropdownMenuShortcut>⌘ E</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>归档</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>;
} };
