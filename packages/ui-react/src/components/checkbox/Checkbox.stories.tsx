import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './index';
import { componentSizes } from '../utils/size';

const meta = {
  title: '组件/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    children: '同意使用条款',
    size: 'base',
    disabled: false,
    readOnly: false,
    indeterminate: false,
  },
  argTypes: {
    size: { control: 'select', options: componentSizes },
    onChange: { action: 'change' },
  },
  parameters: {
    docs: {
      description: {
        component:
          '基于 Base UI Checkbox，支持受控/非受控、半选、禁用、只读和表单提交。Space 切换勾选。children 为可选文案，无文案时须提供 aria-label 或 aria-labelledby。响应式 size 必须提供 base。ref 指向交互根元素（默认 span），inputRef 指向表单 input。半选仅控制展示和可访问状态，是否提交仍由 checked 决定；readOnly 已选字段继续提交，disabled 字段不提交。',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const Sizes: Story = {
  name: '七档尺寸',
  render: () => (
    <div className="example-row">
      {componentSizes.map(size => (
        <Checkbox key={size} size={size} defaultChecked>
          {size}
        </Checkbox>
      ))}
    </div>
  ),
};
export const States: Story = {
  name: '状态',
  render: () => (
    <div className="example-row">
      <Checkbox>未选中</Checkbox>
      <Checkbox defaultChecked>已选中</Checkbox>
      <Checkbox indeterminate>半选</Checkbox>
      <Checkbox disabled>禁用</Checkbox>
      <Checkbox disabled defaultChecked>
        禁用已选中
      </Checkbox>
      <Checkbox disabled indeterminate>
        禁用半选
      </Checkbox>
      <Checkbox readOnly defaultChecked>
        只读
      </Checkbox>
    </div>
  ),
};
export const Controlled: Story = {
  name: '受控与半选',
  render: function ControlledExample() {
    const [values, setValues] = useState([true, false]);
    const all = values.every(Boolean);

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <Checkbox
          checked={all}
          indeterminate={!all && values.some(Boolean)}
          onChange={checked => setValues([checked, checked])}
        >
          全选
        </Checkbox>
        {values.map((checked, index) => (
          <Checkbox
            key={index}
            checked={checked}
            onChange={next =>
              setValues(current => current.map((value, i) => (i === index ? next : value)))
            }
          >
            选项 {index + 1}
          </Checkbox>
        ))}
      </div>
    );
  },
};
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'base', xl: '2xl' } },
};
export const IconOnly: Story = {
  name: '无文案',
  args: { children: undefined, 'aria-label': '选择当前行' },
};
export const Form: Story = {
  name: '表单提交',
  render: function FormExample() {
    const [result, setResult] = useState('');
    return (
      <form
        onSubmit={event => {
          event.preventDefault();
          const values: Record<string, FormDataEntryValue> = {};
          new FormData(event.currentTarget).forEach((value, key) => {
            values[key] = value;
          });
          setResult(JSON.stringify(values));
        }}
      >
        <Checkbox name="agreement" value="accepted" required>
          同意使用条款（必选）
        </Checkbox>
        <div className="example-row">
          <button type="submit">提交</button>
        </div>
        <output aria-live="polite">{result}</output>
      </form>
    );
  },
};
