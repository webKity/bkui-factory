import { expect, fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb } from './index';
import { componentSizes } from '../utils/size';

const items = [
  { key: 'home', label: '首页', href: '#home' },
  { key: 'components', label: '组件', href: '#components' },
  { key: 'breadcrumb', label: '面包屑' },
];

const meta = {
  title: '组件/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: { items, size: 'base', separator: '/', 'aria-label': '当前位置' },
  argTypes: {
    items: {
      control: 'object',
      description:
        '空数组不渲染。末项作为当前页，忽略 disabled 并移除链接和事件；静态祖先保留通用属性与事件，禁用项保留通用属性但移除事件。',
    },
    separator: { control: 'text', description: '自定义装饰分隔符；null、布尔值、空字符串隐藏。' },
    'aria-label': {
      control: 'text',
      description:
        '默认 Breadcrumb；可传本地化名称，null 显式移除。aria-labelledby 同时存在时按原生可访问名称算法优先。',
    },
    size: {
      control: 'select',
      options: componentSizes,
      description: '七档尺寸或包含 base 的响应式对象。',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '原生 nav / ol / a 语义。设计 tokens、Web tokens 与样式分层；支持主题、响应式尺寸和 className 覆盖。size 控制内联 --breadcrumb-{scope}-* 引用；外部 CSS 可覆盖 --breadcrumb-font-size / line-height / gap / icon-size 等最终消费变量，无需 !important。',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const Sizes: Story = {
  name: '七档尺寸',
  render: () => (
    <div className="example-stack">
      {componentSizes.map(size => (
        <div className="example-item" key={size}>
          <Breadcrumb items={items} size={size} />
          <code className="example-caption">{size}</code>
        </div>
      ))}
    </div>
  ),
};

export const IconsAndDisabled: Story = {
  name: '图标与禁用项',
  args: {
    separator: '›',
    items: [
      {
        label: '首页',
        href: '#home',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3Z" />
          </svg>
        ),
      },
      { label: '管理中心', href: '#admin', disabled: true },
      { label: '账户设置' },
    ],
  },
};

export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'base', xl: 'lg' } },
};

export const LongLabels: Story = {
  name: '长路径与换行',
  args: {
    items: [...items.slice(0, 2), { label: '这是一条较长的路径名称，用于展示窄容器中的自动换行' }],
  },
  render: args => (
    <div className="example-stack">
      <Breadcrumb {...args} />
    </div>
  ),
};

const onClick = fn(event => event.preventDefault());
export const Navigation: Story = {
  name: '测试：链接与当前页',
  args: {
    items: [
      { label: '首页', href: '#home', onClick },
      { label: '当前页', href: '#current' },
    ],
  },
  play: async ({ canvas, userEvent }) => {
    onClick.mockClear();
    await userEvent.click(canvas.getByRole('link', { name: '首页' }));
    await expect(onClick).toHaveBeenCalledOnce();
    await expect(canvas.getByText('当前页')).toHaveTextContent('当前页');
    await expect(
      canvas.getByRole('navigation').querySelector('[aria-current="page"]'),
    ).toHaveTextContent('当前页');
    await expect(canvas.queryByRole('link', { name: '当前页' })).toBeNull();
  },
};
