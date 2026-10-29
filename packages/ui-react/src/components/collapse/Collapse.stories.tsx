import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Collapse } from './index';
import { componentSizes } from '../utils/size';

const panels = (
  <>
    <Collapse.Item value="account" title="如何管理账户？">前往账户设置，更新个人资料与安全选项。</Collapse.Item>
    <Collapse.Item value="security" title="如何保护账户安全？">开启双重验证，并定期检查登录设备。</Collapse.Item>
    <Collapse.Item value="disabled" title="暂未开放" disabled>此功能暂不可用。</Collapse.Item>
  </>
);

const meta = {
  title: '组件/Collapse',
  component: Collapse,
  tags: ['autodocs'],
  args: { children: panels, size: 'base', variant: 'outline', accordion: false, disabled: false, onChange: fn() },
  argTypes: {
    size: { control: 'select', options: componentSizes },
    variant: { control: 'select', options: ['outline', 'fill', 'ghost'] },
    onChange: { action: 'change' },
  },
  parameters: { docs: { description: { component:
    '基于 Base UI Accordion。使用 Collapse.Item（或 CollapseItem），以唯一 value 标识面板，title 为标题。默认允许多项展开；accordion 开启手风琴模式，value/defaultValue 均只保留第一项。value/onChange 支持受控，defaultValue 设置初始展开项。支持七档与响应式尺寸、三种视觉样式、部分覆盖 icons 和禁用状态。标题默认使用 h3，可用 headerLevel 调整为 h1–h6。标题支持 Tab 聚焦以及 Enter/Space 切换；keepMounted 可保留内容状态。',
  } } },
} satisfies Meta<typeof Collapse>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Accordion: Story = { name: '手风琴', args: { accordion: true, defaultValue: ['account'] } };
export const Variants: Story = {
  name: '视觉样式',
  render: () => <div className="example-stack">{(['outline', 'fill', 'ghost'] as const).map(variant => (
    <Collapse key={variant} variant={variant} defaultValue={['intro']}>
      <Collapse.Item value="intro" title={variant}>折叠面板内容</Collapse.Item>
      <Collapse.Item value="details" title="更多信息">详细说明</Collapse.Item>
    </Collapse>
  ))}</div>,
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div className="example-stack">{componentSizes.map(size => (
    <Collapse key={size} size={size} defaultValue={['item']}><Collapse.Item value="item" title={size}>尺寸示例</Collapse.Item></Collapse>
  ))}</div>,
};
export const Responsive: Story = { name: '响应式尺寸', args: { size: { base: 'xs', md: 'base', xl: 'lg' } } };
export const CustomIcons: Story = {
  name: '自定义图标', args: { icons: { open: 'minus', close: 'plus' } },
};
export const Disabled: Story = { name: '整体禁用', args: { disabled: true, defaultValue: ['account'] } };
export const Controlled: Story = {
  name: '受控状态',
  render: function ControlledExample() {
    const [value, setValue] = useState(['account']);
    return <div className="example-stack">
      <p>当前展开：{value.join(', ') || '无'}</p>
      <Collapse value={value} onChange={setValue}>{panels}</Collapse>
    </div>;
  },
};
