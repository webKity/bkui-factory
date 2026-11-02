import type { Meta, StoryObj } from '@storybook/react-vite';
import { Attachment } from './index';
import { Button } from '../button';
import { componentSizes } from '../utils/size';

const img = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#dbeafe"/><path d="M24 14h22l12 12v40H24z" fill="#2563eb"/><path d="M32 40h18M32 48h18M32 56h12" stroke="white" stroke-width="3"/></svg>')}`;

const meta = {
  title: '组件/Attachment',
  component: Attachment,
  tags: ['autodocs'],
  args: { img, title: '产品说明.pdf', desc: 'PDF · 2.4 MB', size: 'base', round: false },
  argTypes: {
    size: { control: 'select', options: componentSizes, description: '七档尺寸；响应式对象必须提供 base，缺失时在运行时抛错。' },
    round: { control: 'boolean' },
    alt: { control: 'text' },
    loading: { control: 'select', options: ['lazy', 'eager'] },
    action: { control: false },
    renderImage: { control: false },
  },
  parameters: {
    docs: { description: { component: '基于 Avatar 的附件信息行。图片、标题与描述组成主区域，action 独立展示。link 使主区域成为原生链接；此时 title、desc 和自定义图片内不应包含链接或按钮等交互元素，交互操作应放在独立的 action 中。支持七档及响应式尺寸、圆形图片、备用图片和 renderImage。主图或备用图地址变化都会重置图片失败状态并重新尝试主图。根元素负责文字和间距断点，Avatar 负责图片尺寸与形状。默认懒加载，可设置 loading="eager" 预加载。富文本标题可通过 alt 指定图片及失败占位的可访问名称。空 link 按普通内容渲染。通过 CSS 类覆盖 --attachment-* 局部 tokens，不提供 style 参数。' } },
  },
} satisfies Meta<typeof Attachment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: '可调试用例' };
export const WithAction: Story = {
  name: '链接与操作',
  args: { link: '#attachment', action: <Button size="sm" variant="outline">下载</Button> },
};
export const Sizes: Story = {
  name: '七档尺寸',
  render: args => <div style={{ display: 'grid', gap: 20 }}>
    {componentSizes.map(size => <Attachment {...args} key={size} size={size} />)}
  </div>,
};
export const Round: Story = { name: '圆形图片', args: { round: true } };
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { size: { base: 'xs', md: 'lg', xl: '2xl' } },
};
export const ImageFallback: Story = {
  name: '备用图片',
  args: { img: 'data:image/png;base64,invalid', imgFallback: img },
};
export const FailedImage: Story = {
  name: '图片失败',
  args: { img: 'data:image/png;base64,invalid' },
};
export const CustomImage: Story = {
  name: '自定义图片',
  args: { renderImage: ({ imageProps }) => <img {...imageProps} loading="lazy" /> },
  parameters: { docs: { description: { story: 'renderImage 在 Avatar 内渲染；imageProps 提供 src、alt 和布局类。必须返回单个 ReactElement；自定义图片的加载及错误回退由调用方处理。' } } },
};
export const LongContent: Story = {
  name: '长文案截断',
  args: { title: '产品说明文档与设计规范更新记录.pdf'.repeat(3), desc: '较长的附件描述'.repeat(20), action: <Button size="sm">下载</Button> },
  render: args => <div style={{ maxWidth: 360 }}><Attachment {...args} /></div>,
};
