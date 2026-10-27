import { InputOTP } from './index';
import { componentSizes } from '../utils/size';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

const meta = {
  title: '组件/inputOTP',
  component: InputOTP,
  tags: ['autodocs'],
  args: { length: 6, size: 'base', type: 'text' },
  argTypes: {
    size: { control: 'select', options: componentSizes, description: '七档尺寸，也支持包含基础尺寸（base）的响应式对象。' },
    type: { control: { type: 'inline-radio', labels: { text: '明文', password: '密码' } }, options: ['text', 'password'], description: '输入内容的显示方式。' },
    length: { control: { type: 'number', min: 1, step: 1 }, description: '验证码位数，默认为六位，必须为正整数。' },
    disabled: { description: '禁用输入。' },
    readOnly: { description: '仅展示验证码，不允许编辑。' },
    value: { description: '受控验证码值。' },
    defaultValue: { description: '非受控模式下的初始验证码。' },
    onValueChange: { description: '验证码变化时触发。' },
    onValueComplete: { description: '验证码填写完整时触发。' },
  },
  parameters: {
    docs: { description: { component: '验证码输入框基于 Base UI 构建，支持输入、粘贴、自动聚焦及校验。样式通过 --input-otp-* 组件样式变量配置，支持七档尺寸、响应式尺寸和密码显示。' } },
  },
  // Base UI 将 id 应用到第一位输入，label 为整组验证码提供名称。
  render: args => <label className="example-stack">验证码<InputOTP {...args} /></label>,
} satisfies Meta<typeof InputOTP>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Password: Story = { name: '密码模式', args: { type: 'password', defaultValue: '123456' } };
export const Disabled: Story = { name: '禁用状态', args: { disabled: true, defaultValue: '123456' } };
export const ReadOnly: Story = { name: '只读状态', args: { readOnly: true, defaultValue: '123456' } };
export const Alphanumeric: Story = { name: '字母与数字', args: { validationType: 'alphanumeric', defaultValue: 'A1B2C3' } };
export const Responsive: Story = { name: '响应式尺寸', args: { size: { base: 'sm', md: 'base', xl: 'lg' } } };
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div className="example-stack">{componentSizes.map(size => (
    <label key={size} className="example-stack">{size}<InputOTP size={size} length={4} /></label>
  ))}</div>,
};
export const ComponentTokens: Story = {
  name: '组件样式变量覆盖',
  args: { style: { '--input-otp-border-radius': '12px', '--input-otp-gap': '12px' } as CSSProperties },
};
