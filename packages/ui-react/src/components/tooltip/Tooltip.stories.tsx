import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, TooltipProvider } from './index';
import { Button } from '../button';
import type { IBKSize } from '../types/base';

const meta = {
  title: '组件/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: { children: <Button>悬停或聚焦</Button>, content: '补充说明信息', size: 'sm', side: 'top', align: 'center', arrow: true, disabled: false },
  argTypes: {
    children: { control: false },
    content: { control: 'text' },
    sideOffset: { control: 'number', description: '带箭头默认 8，无箭头默认 4；显式设置优先。' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    side: { control: 'select', options: ['top', 'bottom', 'left', 'right', 'inline-start', 'inline-end'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  parameters: { docs: { description: { component: '基于 Base UI Tooltip，支持悬停与键盘焦点、Escape 关闭、边界避让和共享延时。响应式 size 必须提供 base。children 须有可访问名称、避免原生 title，并透传 DOM props 与 ref；className 和 ref 指向浮层。提示内容不应包含交互控件。' } } },
  decorators: [Story => <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Story /></div>],
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Sides: Story = {
  name: '四个方向',
  render: () => <div className="example-row">{(['top', 'bottom', 'left', 'right'] as const).map(side =>
    <Tooltip key={side} content={`${side} 方向提示`} side={side}><Button>{side}</Button></Tooltip>)}</div>,
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div className="example-row">{(['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as IBKSize[]).map(size =>
    <Tooltip key={size} size={size} content={`${size} 尺寸提示`}><Button size={size}>{size}</Button></Tooltip>)}</div>,
};
export const SharedDelay: Story = {
  name: '共享延时',
  render: () => <TooltipProvider delay={200} closeDelay={100}><div className="example-row">
    {['复制', '收藏', '分享'].map(label => <Tooltip key={label} content={label}><Button>{label}</Button></Tooltip>)}
  </div></TooltipProvider>,
};
export const LongContent: Story = {
  name: '长文本与响应式尺寸',
  args: { size: { base: 'xs', md: 'sm', lg: 'base' }, content: '这里是一段较长的补充说明，提示框会自动换行，并在靠近视口边缘时自动调整位置。ThisIsAVeryLongWordThatShouldWrapWithoutOverflowingTheViewport.' },
};
export const WithoutArrow: Story = { name: '无箭头', args: { arrow: false } };
export const Disabled: Story = { name: '禁用提示', args: { disabled: true } };
export const Controlled: Story = {
  name: '受控状态',
  render: function ControlledExample() {
    const [open, setOpen] = useState(false);
    return <div className="example-row">
      <Button onClick={() => setOpen(value => !value)}>切换提示</Button>
      <Tooltip open={open} onOpenChange={setOpen} content="受控提示"><Button>触发元素</Button></Tooltip>
    </div>;
  },
};
