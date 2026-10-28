import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rating } from './index';
import { componentSizes } from '../utils/size';

const meta = {
  title: '组件/Rating',
  component: Rating,
  tags: ['autodocs'],
  args: { defaultValue: 3, count: 5, size: 'base', trigger: 'click' },
  argTypes: {
    size: { control: 'select', options: componentSizes },
    trigger: { control: 'inline-radio', options: ['click', 'hover'] },
    count: { control: { type: 'number', min: 1, step: 1 } },
  },
  parameters: {
    docs: { description: { component: '整数评分组件，默认点击提交、鼠标悬停预览，外部 value 更新时清除预览。hover 模式移入即提交，不同分值逐次通知，连续相同分值去重。支持原生单选框的方向键与空格操作；0 表示未评分。未传 name 时各实例独立成组。只读模式使用 meter 展示数值，不产生表单字段。可通过 aria-label 或 getAriaLabel 自定义整体名称，aria-label 优先；getItemAriaLabel 仅用于交互选项。可通过 --rating-* CSS 变量覆盖样式。' } },
  },
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Empty: Story = { name: '未评分', args: { defaultValue: 0 } };
export const Hover: Story = { name: '悬停提交', args: { trigger: 'hover' } };
export const Disabled: Story = { name: '禁用', args: { disabled: true } };
export const ReadOnly: Story = { name: '只读', args: { readOnly: true } };
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'sm', md: 'base', xl: 'lg' } },
  parameters: { docs: { description: { story: '断点依据视口宽度：sm 40rem、md 48rem、lg 64rem、xl 80rem、2xl 96rem。本例默认使用 sm 尺寸，48rem 起使用 base，80rem 起使用 lg；可调整 Storybook 视口查看。' } } },
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div className="example-stack">{componentSizes.map(size => (
    <div key={size}><span>{size} </span><Rating size={size} defaultValue={3} aria-label={`${size} 评分`} /></div>
  ))}</div>,
};
export const Controlled: Story = {
  name: '受控评分',
  render: function Render(args) {
    const [value, setValue] = useState(3);
    return <div className="example-stack">
      <Rating {...args} value={value} onChange={setValue} />
      <span>当前评分：{value}</span>
      <button type="button" onClick={() => setValue(0)}>重置评分</button>
    </div>;
  },
};
