import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radios } from './index';
import type { IBKIntent, IBKVariants } from '../types/base';

const options = [
  { label: '按月付费', value: 'monthly' },
  { label: '按年付费', value: 'yearly' },
  { label: '企业方案', value: 'enterprise', disabled: true },
];

const meta = {
  title: '组件/Radio',
  component: Radios,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '基于 Base UI Radio.Root（默认 span）与 RadioGroup。label/other 请使用文本或装饰节点，不要嵌套链接、按钮等交互元素。通过 className 和局部 CSS tokens 自定义样式，不支持 style。fill 的滑块在两种主题中均固定为白色配深色文字，长文案单行截断。',
      },
    },
  },
  args: { options, defaultValue: 'monthly', variant: 'ghost', intent: 'brand', size: 'base', onChange: fn(), 'aria-label': '付费方式' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['outline', 'fill', 'ghost'] },
    intent: { control: 'select', options: ['normal', 'brand', 'success', 'danger', 'warning'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    round: { control: 'boolean', description: 'fill 使用全圆角；false 使用普通圆角。默认 true。' },
    onChange: { control: false },
  },
} satisfies Meta<typeof Radios>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const FillCorners: Story = {
  name: 'Fill 模式圆角',
  args: { variant: 'fill' },
  render: args => (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
      <Radios {...args} round aria-label="全圆角" />
      <Radios {...args} round={false} aria-label="普通圆角" />
    </div>
  ),
};

export const LongLabels: Story = {
  name: '长文案显示',
  args: {
    variant: 'fill',
    options: [
      { label: '按月付费的长文案选项', value: 'monthly' },
      { label: '按年付费的长文案选项', value: 'yearly', other: '包含完整服务与技术支持' },
    ],
  },
  render: args => <div style={{ width: 240, maxWidth: '100%' }}><Radios {...args} /></div>,
};

export const Variants: Story = {
  name: '三种变体',
  render: args => (
    <div style={{ display: 'grid', gap: 32, justifyItems: 'start' }}>
      {(['outline', 'fill', 'ghost'] as IBKVariants[]).map(variant => (
        <Radios {...args} key={variant} variant={variant} options={variant === 'outline' ? options.map(option => ({ ...option, other: '适合不同阶段的团队' })) : options} />
      ))}
    </div>
  ),
};

export const Intents: Story = {
  name: '五种意图',
  render: args => (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
      {(['normal', 'brand', 'success', 'warning', 'danger'] as IBKIntent[]).map(intent => (
        <Radios {...args} key={intent} intent={intent} />
      ))}
    </div>
  ),
  args: { variant: 'outline' },
};

export const Sizes: Story = {
  name: '七种尺寸',
  render: args => (
    <div style={{ display: 'grid', gap: 20, justifyItems: 'start' }}>
      {(['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map(size => (
        <Radios {...args} key={size} size={size} />
      ))}
    </div>
  ),
  args: { variant: 'fill' },
};

export const Responsive: Story = { 
  name: '自适应尺寸',
  args: { variant: 'outline', size: { base: 'xs', md: 'base', xl: 'lg' } }
};
export const Disabled: Story = { name: '禁止状态', ...Variants, args: { disabled: true } };
export const ReadOnly: Story = { name: '只读状态', ...Variants, args: { readOnly: true } };

function ControlledExample() {
  const [value, setValue] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Radios aria-label="周期" variant="fill" value={value} onChange={setValue} options={[
        { label: '一天', value: 0 }, { label: '一周', value: 7 }, { label: '一个月', value: 30 },
      ]} />
      <output>当前值：{value}</output>
    </div>
  );
}
export const Controlled: Story = { name: '受控模式', render: () => <ControlledExample /> };

export const Keyboard: Story = {
  name: '键盘控制',
  args: { variant: 'fill' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const monthly = canvas.getByRole('radio', { name: '按月付费' });
    monthly.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: '按年付费' })).toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    await expect(monthly).toBeChecked();
  },
};
