
import { expect } from 'storybook/test';
import { Loading } from './index';
import { Button } from '../button';

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { IBKSize } from '../types/base';

const sizes: IBKSize[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];
const types = ['normal', 'rect', 'logo'] as const;

const meta = {
  title: '组件/Loading',
  component: Loading,
  tags: ['autodocs'],
  args: { type: 'normal', size: 'base', ariaLabel: '加载中' },
  argTypes: {
    type: { control: 'inline-radio', options: types, description: 'normal：旋转 loader 图标；rect：五根伸缩柱子；logo：BitKan Logo 渐显。' },
    size: { control: 'select', options: sizes, description: '七档尺寸，也支持像素数值或响应式对象；base 高度为 18px。' },
    fillColor: { control: 'color', description: '默认继承 currentColor；通过 --loading-color 覆盖。' },
    speed: { control: { type: 'number', min: 1, step: 100 }, description: '一次动画循环的毫秒数。normal 默认 800ms，rect 1000ms，logo 3320ms。' },
    ariaLabel: { control: 'text', description: '默认状态名称为“加载中”；在 Button 中作为装饰内容隐藏。' },
    className: { control: 'text' },
  },
  parameters: {
    docs: { description: { component: 'Loading 的样式仅消费 --loading-* 组件 tokens。normal 直接复用 BKIcon loader；logo 使用原始矢量路径，逐步显现后淡出。系统开启减少动态效果时停止动画，保持加载图形可见。' } },
  },
} satisfies Meta<typeof Loading>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Rect: Story = { args: { type: 'rect', size: 32 } };
export const Logo: Story = { args: { type: 'logo', size: 48 } };
export const Types: Story = {
  render: () => <div className="example-row">{types.map(type => <div className="example-item" key={type}>
    <Loading type={type} size={32} ariaLabel={`${type} 加载中`} /><code className="example-caption">{type}</code>
  </div>)}</div>,
  play: async ({ canvas }) => {
    const statuses = canvas.getAllByRole('status');
    await expect(statuses).toHaveLength(3);
    await expect(statuses[0]).toHaveAccessibleName('normal 加载中');
    await expect(statuses[1]).toHaveAccessibleName('rect 加载中');
    await expect(statuses[2]).toHaveAccessibleName('logo 加载中');
  },
};
export const Sizes: Story = {
  render: () => <div className="example-stack">{types.map(type => <div className="example-row" key={type}>{sizes.map(size => <div className="example-item" key={size}>
    <Loading type={type} size={size} /><code className="example-caption">{type} / {size}</code>
  </div>)}</div>)}</div>,
};
export const Responsive: Story = {
  args: { type: 'rect', size: { sm: 'xs', lg: 'lg', '2xl': '2xl' } },
};
export const ColorsAndSpeed: Story = {
  render: () => <div className="example-row">{types.map(type => <Loading key={type} type={type} size={32} fillColor="var(--color-action-link)" speed={1600} />)}</div>,
};
export const ComponentTokens: Story = {
  render: () => <div className="example-row">{types.map(type => <Loading key={type} type={type} style={{
    '--loading-color': 'var(--color-feedback-success)', '--loading-size': '36px', '--loading-duration': '1800ms',
  } as CSSProperties} />)}</div>,
};
export const InButton: Story = {
  render: () => <div className="example-stack">
    <div className="example-row">{sizes.map(size => <Button key={size} size={size} loading intent="info">提交中</Button>)}</div>
    <div className="example-row"><Button loading variant="line">加载中</Button><Button loading link="#loading">链接加载中</Button><Button loading aria-label="提交订单" /></div>
  </div>,
};
