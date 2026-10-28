import { InputOTP } from './index';
import { componentSizes } from '../utils/size';
import { useId } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

const meta = {
  title: '组件/InputOTP',
  component: InputOTP,
  tags: ['autodocs'],
  args: { length: 6, size: 'base' },
  argTypes: {
    size: { control: 'select', options: componentSizes, description: '七档尺寸，也支持包含基础尺寸（base）的响应式对象。' },
    type: { control: { type: 'inline-radio', labels: { text: '明文', password: '密码' } }, options: ['text', 'password'], description: '输入内容的显示方式；传入后覆盖 mask，未传时遵循 mask。' },
    mask: { control: 'boolean', description: '是否隐藏输入内容；仅在未传 type 时生效。' },
    length: { control: { type: 'number', min: 1, step: 1 }, description: '验证码位数，默认为六位；非正安全整数会回退为六位。' },
    validationType: { control: 'select', options: ['numeric', 'alpha', 'alphanumeric', 'none'], description: '允许的字符类型，默认为数字。' },
    disabled: { description: '禁用输入。' },
    readOnly: { description: '仅展示验证码，不允许编辑。' },
    value: { description: '受控验证码值。' },
    defaultValue: { description: '非受控模式下的初始验证码。' },
    onValueChange: { description: '验证码变化时触发。' },
    onValueComplete: { description: '验证码填写完整时触发。' },
  },
  parameters: {
    docs: { description: { component: '验证码输入框基于 Base UI 构建，支持输入、粘贴、自动聚焦及校验。样式通过 --input-otp-* 组件样式变量配置，支持七档尺寸、响应式尺寸和密码显示。自定义 children 时，需保证 OTPField.Input 数量与 length 一致。' } },
  },
  // Base UI 将 id 应用到第一位输入，aria-labelledby 为整组及各输入提供名称。
  render: function Render(args) {
    const generatedId = useId();
    const id = args.id ?? generatedId;
    const labelId = `${generatedId}-label`;
    return <div className="example-stack">
      <label id={labelId} htmlFor={id}>验证码</label>
      <InputOTP aria-labelledby={labelId} {...args} id={id} />
    </div>;
  },
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
  render: function Render() {
    const id = useId();
    return <div className="example-stack">{componentSizes.map(size => (
      <div key={size} className="example-stack">
        <label id={`${id}-${size}-label`} htmlFor={`${id}-${size}`}>{size}</label>
        <InputOTP id={`${id}-${size}`} aria-labelledby={`${id}-${size}-label`} size={size} length={4} />
      </div>
    ))}</div>;
  },
};
export const ComponentTokens: Story = {
  name: '组件样式变量覆盖',
  args: { style: { '--input-otp-border-radius': '12px', '--input-otp-gap': '12px' } as CSSProperties },
};
