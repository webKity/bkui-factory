import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './index';
import type { PaginationProps } from './type';

function ControlledPagination(args: PaginationProps) {
  const [current, setCurrent] = useState(args.current);
  return <div className="example-stack">
    <Pagination {...args} current={current} onChange={page => { setCurrent(page); args.onChange?.(page); }} />
    <p className="example-note" aria-live="polite">当前第 {current} 页，共 {args.totalPage} 页</p>
  </div>;
}

const meta = {
  title: '组件/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: { current: 1, totalPage: 20, pagerCount: 7, as: 'button', size: 'base', disabled: false, onChange: fn() },
  argTypes: {
    current: { control: { type: 'number', min: 1 }, description: '受控当前页，从 1 开始；切页后由调用方更新。' },
    totalPage: { control: { type: 'number', min: 0 }, description: '总页数，0 表示没有可用页。' },
    pagerCount: { control: { type: 'number', min: 5, step: 2 }, description: '页码窗口大小，默认 7；省略号另计，单页间隔会补齐。' },
    as: { control: 'inline-radio', options: ['button', 'a'], description: '按钮切页或原生链接；链接地址通过 itemProps / getItemProps 配置。' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    itemProps: { control: false, description: '按目标页码传入原生属性。' },
    getItemProps: { control: false, description: '按页码和 page / previous / next 返回属性，覆盖静态 itemProps。' },
    onChange: { control: false },
  },
  parameters: { docs: { description: { component: '受控分页组件，复用 Button 的主题、尺寸、禁用与焦点样式。保留首尾页，大页数使用省略号；支持原生链接导航。' } } },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const Controlled: Story = {
  name: '受控切页',
  render: args => <ControlledPagination {...args} />,
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('button', { name: '上一页' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: '下一页' }));
    await expect(args.onChange).toHaveBeenCalledWith(2);
    await expect(canvas.getByRole('button', { name: '第 2 页' })).toHaveAttribute('aria-current', 'page');
  },
};

export const PageWindows: Story = {
  name: '页码省略与边界',
  render: () => <div className="example-stack">{[1, 3, 10, 18, 20].map(current => <Pagination key={current} current={current} totalPage={20} />)}</div>,
};

export const Sizes: Story = {
  name: '尺寸与响应式',
  render: () => <div className="example-stack">
    {(['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map(size => <div key={size} className="example-row"><code>{size}</code><Pagination current={3} totalPage={5} size={size} /></div>)}
    <Pagination current={4} totalPage={10} size={{ base: 'xs', md: 'base', xl: 'lg' }} />
  </div>,
};

export const Links: Story = {
  name: '原生链接',
  args: { as: 'a', current: 5, getItemProps: (page, type) => ({ href: `?page=${page}`, 'data-item-type': type }) },
};

export const ItemAttributes: Story = {
  name: '逐项属性与取消切页',
  args: {
    current: 2,
    totalPage: 5,
    itemProps: { 3: { disabled: true, title: '第 3 页暂不可用' } },
    getItemProps: (page, type) => type === 'page' && page === 4
      ? { title: '调用 preventDefault 取消本次切页', onClick: event => event.preventDefault() }
      : undefined,
  },
};

export const States: Story = {
  name: '禁用、空数据与单页',
  render: () => <div className="example-stack">
    <Pagination current={3} totalPage={10} disabled />
    <Pagination current={1} totalPage={0} />
    <Pagination current={1} totalPage={1} />
    <Pagination current={1} totalPage={5} as="a" disabled getItemProps={page => ({ href: `?page=${page}` })} />
  </div>,
};
