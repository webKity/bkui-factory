import { Alert } from './index';
import { Button } from '../button';
import { componentSizes } from '../utils/size';
import type { Meta, StoryObj } from '@storybook/react-vite';

const info = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><circle cx="8" cy="8" r="6" /><path d="M8 7v5M8 4v1" /></svg>;
const meta = {
  title: '组件/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: { message: '这是一条提示信息', intent: 'normal', size: 'base', closable: false },
  argTypes: {
    intent: { control: 'select', options: ['normal', 'brand', 'success', 'warning', 'danger'] },
    size: { control: 'select', options: componentSizes },
    prefixIcon: { control: false },
    suffixIcon: { control: false },
    action: { control: false },
    onClose: { control: false, description: '关闭动画结束并移除组件后触发一次。' },
  },
  parameters: { docs: { description: { component: '支持五种意图、七档响应式尺寸及自定义内容插槽。样式只消费 --alert-* 组件 tokens。closable 默认关闭，onClose 在关闭动画结束时触发；减少动态效果时直接关闭。' } } },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Intents: Story = {
  name: '五种意图',
  render: () => <div style={{ display: 'grid', gap: 16 }}>{(['normal', 'brand', 'success', 'warning', 'danger'] as const).map(intent =>
    <Alert key={intent} intent={intent} prefixIcon={info} message={`${intent} 提示`} description="这里是提示的详细说明，支持长文本自动换行。" />,
  )}</div>,
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div style={{ display: 'grid', gap: 16 }}>{componentSizes.map(size =>
    <Alert key={size} size={size} message={`${size} 提示信息`} prefixIcon={info} closable />,
  )}</div>,
};
export const Slots: Story = {
  name: '内容与操作插槽',
  args: { prefixIcon: info, suffixIcon: info, description: '你可以自定义前后图标、内容样式与操作项。', action: <Button size="xs" variant="ghost" intent="brand">查看详情</Button>, closable: true },
};
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'base', xl: 'lg' }, prefixIcon: info, description: '缩放视口以查看尺寸变化。', closable: true },
};
