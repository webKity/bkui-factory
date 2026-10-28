import { useState } from 'react';
import { Input, Textarea, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, InputGroupTextarea } from './index';
import { Button } from '../button';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: '组件/Input', component: Input, tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'InputGroup 统一提供外框，Input / Textarea（或其 InputGroupInput / InputGroupTextarea 别名）自动继承尺寸、外观及 disabled/readOnly，子组件可显式覆盖。附加区域默认 inline-start，后缀请传 align="inline-end"。自定义附加按钮需自行设置 disabled。type="number" 使用非负十进制文本输入，支持 locale 小数点、不支持千分位；required 生效，min/max/step 用于步进，不提供原生数字校验。decimal 会将 min 向上、max 向下收敛至可表示的边界，空区间禁用步进。只读密码允许切换可见性。',
      },
    },
  },
  args: { placeholder: '请输入内容', size: 'base', intent: 'normal', variant: 'outline', clearable: true },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    intent: { control: 'select', options: ['normal', 'brand', 'success', 'warning', 'danger'] },
    variant: { control: 'select', options: ['fill', 'outline', 'ghost'] },
  },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Composed: Story = {
  name: '组合：前后缀与操作',
  render: () => <InputGroup size={{ base: 'sm', md: 'lg' }}>
    <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
    <InputGroupInput aria-label="网址" placeholder="example.com" clearable />
    <InputGroupAddon align="inline-end"><Button size="sm">访问</Button></InputGroupAddon>
  </InputGroup>,
};
export const Numeric: Story = {
  name: '数字精度、步进和受控值',
  render: function NumericExample() {
    const [value, setValue] = useState('0.1');
    return <InputGroup>
      <InputGroupInput aria-label="金额" type="number" value={value} onChange={event => setValue(event.target.value)}
        decimal={2} step="0.1" min="0" max="100" showNumberStepper clearable />
      <InputGroupAddon align="inline-end"><InputGroupText>USDT</InputGroupText></InputGroupAddon>
    </InputGroup>;
  },
};
export const Password: Story = { args: { type: 'password', defaultValue: 'password' } };
export const Multiline: Story = {
  name: '组合：多行与块级附加区域',
  render: () => <InputGroup>
    <InputGroupAddon align="block-start"><InputGroupText>备注</InputGroupText></InputGroupAddon>
    <InputGroupTextarea aria-label="备注" rows={3} placeholder="请输入备注" />
    <InputGroupAddon align="block-end"><Button size="sm">提交</Button></InputGroupAddon>
  </InputGroup>,
};
export const States: Story = {
  name: '禁用、只读与校验',
  render: () => <div style={{ display: 'grid', gap: 16 }}>
    <Input disabled defaultValue="禁用" clearable />
    <Input readOnly defaultValue="只读" clearable />
    <Input intent="danger" aria-invalid="true" aria-label="错误输入" defaultValue="请检查内容" />
    <Textarea placeholder="独立多行输入" aria-label="多行输入" />
  </div>,
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div style={{ display: 'grid', gap: 16 }}>
    {(['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map(size => <Input key={size} size={size} placeholder={size} aria-label={size} />)}
  </div>,
};
export const Variants: Story = {
  name: '变体与意图',
  render: () => <div style={{ display: 'grid', gap: 16 }}>
    {(['fill', 'outline', 'ghost'] as const).flatMap(variant => (['normal', 'brand', 'success', 'warning', 'danger'] as const)
      .map(intent => <Input key={`${variant}-${intent}`} variant={variant} intent={intent} placeholder={`${variant} / ${intent}`} aria-label={`${variant} / ${intent}`} />))}
  </div>,
};

export const GroupStates: Story = {
  name: '组合：错误、禁用和只读',
  render: () => <div style={{ display: 'grid', gap: 16 }}>
    <InputGroup>
      <InputGroupInput aria-label="错误金额" aria-invalid="true" placeholder="子输入错误会使外框变红" variant="outline" />
      <InputGroupAddon align="inline-end"><InputGroupText>USDT</InputGroupText></InputGroupAddon>
    </InputGroup>
    <InputGroup disabled>
      <InputGroupInput aria-label="禁用金额" type="number" defaultValue="10" showNumberStepper />
      <InputGroupAddon align="inline-end"><InputGroupText>USDT</InputGroupText></InputGroupAddon>
    </InputGroup>
    <InputGroup readOnly>
      <InputGroupTextarea aria-label="只读备注" defaultValue="组级只读" />
    </InputGroup>
  </div>,
};
