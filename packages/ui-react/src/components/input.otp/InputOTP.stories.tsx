import { InputOTP } from './index';
import { componentSizes } from '../utils/size';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

const meta = {
  title: '组件/InputOTP',
  component: InputOTP,
  tags: ['autodocs'],
  args: { length: 6, size: 'base', type: 'text' },
  argTypes: {
    size: { control: 'select', options: componentSizes },
    type: { control: 'inline-radio', options: ['text', 'password'] },
    length: { control: { type: 'number', min: 1, step: 1 } },
  },
  // Base UI 将 id 应用到第一位输入，label 为整组验证码提供名称。
  render: args => <label className="example-stack">验证码<InputOTP {...args} /></label>,
} satisfies Meta<typeof InputOTP>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Password: Story = { args: { type: 'password', defaultValue: '123456' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '123456' } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: '123456' } };
export const Alphanumeric: Story = { args: { validationType: 'alphanumeric', defaultValue: 'A1B2C3' } };
export const Responsive: Story = { args: { size: { base: 'sm', md: 'base', xl: 'lg' } } };
export const Sizes: Story = {
  render: () => <div className="example-stack">{componentSizes.map(size => (
    <label key={size} className="example-stack">{size}<InputOTP size={size} length={4} /></label>
  ))}</div>,
};
export const ComponentTokens: Story = {
  args: { style: { '--input-otp-border-radius': '12px', '--input-otp-gap': '12px' } as CSSProperties },
};
