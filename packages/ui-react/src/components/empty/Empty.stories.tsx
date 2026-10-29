import type { Meta, StoryObj } from '@storybook/react-vite';
import { Empty } from './index';
import { Button } from '../button';
import { BKIcon } from '../icon';
import { componentSizes } from '../utils/size';

const meta = {
  title: '组件/Empty',
  component: Empty,
  tags: ['autodocs'],
  args: { description: '暂无数据', size: 'base' },
  argTypes: {
    description: { control: 'text', description: '描述内容；null、false 或空白字符串隐藏。' },
    image: { control: false, description: '图片 URL 或自定义节点；null、false 或空白字符串隐藏。' },
    size: { control: 'select', options: componentSizes, description: '七档尺寸，支持包含 base 的响应式对象。' },
    children: { control: false, description: '描述下方的操作区，可放置按钮或链接。' },
  },
  parameters: {
    docs: {
      description: {
        component: '空状态组件，默认展示装饰性插图和“暂无数据”。样式只消费局部 --empty-* tokens，支持主题切换与响应式尺寸。自定义图片节点可自行提供无障碍名称。',
      },
    },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const WithActions: Story = {
  args: {
    description: '还没有创建项目',
    children: <Button intent="brand">创建项目</Button>,
  },
};

export const CustomImage: Story = {
  args: {
    image: <BKIcon name="search" size="100%" renderInServer />,
    description: <>没有找到相关结果，请尝试其他关键词。</>,
  },
};

export const ImageURL: Story = {
  args: {
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96"%3E%3Crect x="20" y="16" width="80" height="64" rx="8" fill="%2394a3b8"/%3E%3Cpath d="M40 40h40M40 56h24" stroke="white" stroke-width="4"/%3E%3C/svg%3E',
    description: '使用自定义图片 URL',
  },
};

export const DescriptionOnly: Story = {
  args: { image: null, description: '暂无消息' },
};

export const ImageOnly: Story = {
  args: { description: null, role: 'img', 'aria-label': '暂无数据' },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
      {componentSizes.map(size => <Empty key={size} size={size} description={size} />)}
    </div>
  ),
};

export const Responsive: Story = {
  args: {
    size: { base: 'xs', md: 'base', xl: 'lg' },
    description: '调整窗口宽度，查看插图、间距和文字尺寸的变化',
  },
};

export const LongDescription: Story = {
  render: args => (
    <div style={{ width: 240, maxWidth: '100%' }}>
      <Empty {...args} />
    </div>
  ),
  args: { description: '当前筛选条件下没有找到相关记录，请调整筛选条件后重试，或创建一条新的记录。' },
};
