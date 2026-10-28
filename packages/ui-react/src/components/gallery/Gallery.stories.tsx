import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { Gallery, showGallery } from './index';
import type { GalleryItem } from './type';

// 使用内联 SVG，让图片示例无需依赖外部图片服务。
function image(background: string, label: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="${background}"/><circle cx="920" cy="140" r="80" fill="#ffffff" opacity=".3"/><path d="M0 675 350 180 700 675M450 675 850 300 1200 675" fill="#ffffff" opacity=".2"/><text x="70" y="560" fill="white" font-family="sans-serif" font-size="64">${label}</text></svg>`)}`;
}
const items: GalleryItem[] = [
  { src: image('#326857', 'Mountain'), title: '山间清晨', description: '图片支持标题、说明与替代文本。', alt: '绿色山峦插画' },
  { src: image('#356292', 'Ocean'), title: '海边日落', alt: '蓝色海岸插画' },
  { src: image('#835281', 'Evening'), title: '暮色', alt: '紫色山峦插画' },
];

const meta = {
  title: '组件/Gallery', component: Gallery, tags: ['autodocs'],
  args: { items, loop: false, showArrows: true, showDots: true, showCounter: true, showThumbnails: true, captionPosition: 'overlay', aspectRatio: '16 / 9', objectFit: 'contain' },
  argTypes: {
    index: { control: false, description: '受控索引，与 onIndexChange 配合使用。' },
    defaultIndex: { control: 'number', description: '非受控模式的初始索引，默认 0。' },
    captionPosition: { control: 'inline-radio', options: ['overlay', 'below'] },
    objectFit: { control: 'inline-radio', options: ['contain', 'cover'] },
    onIndexChange: { control: false }, emptyDescription: { control: 'text' },
  },
  parameters: { docs: { description: { component: '支持图片与视频的画廊。聚焦画廊后可用方向键及 Home / End 导航；视频保留原生键盘操作。默认显示箭头、底部圆点、计数器和缩略图；loop 默认关闭。切换时按导航方向横向平移（360ms，先加速后减速），非循环模式下隐藏边界处不可用的箭头，遵循系统减少动态效果偏好；可通过 --gallery-motion-duration 调整时长。showGallery(options) 接收 ShowGalleryOptions，返回关闭函数，支持 Esc、遮罩和关闭按钮退出。样式沿用局部 --gallery-* tokens。' } } },
  decorators: [Story => <div style={{ maxWidth: 800, width: '100%' }}><Story /></div>],
} satisfies Meta<typeof Gallery>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const CaptionBelow: Story = { name: '下方说明与循环', args: { captionPosition: 'below', loop: true } };
export const Minimal: Story = { name: '精简模式', args: { showDots: false, showThumbnails: false, showCounter: false } };
export const Empty: Story = { name: '空状态', args: { items: [], emptyDescription: '还没有上传媒体' } };
export const Failed: Story = { name: '加载失败', args: { items: [{ src: 'data:image/png;base64,invalid', title: '无法加载的图片' }] } };
export const MixedMedia: Story = {
  name: '图片与视频',
  args: { items: [items[0], { type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', poster: items[1].src, title: '花朵视频', description: '切换项目时卸载视频，停止播放。' }, items[2]] },
};
function ControlledExample() {
  const [index, setIndex] = useState(0);
  return <div className="example-stack"><div className="example-row">
    {items.map((item, i) => <Button key={i} intent={index === i ? 'brand' : 'normal'} onClick={() => setIndex(i)}>{item.title}</Button>)}
  </div><Gallery items={items} index={index} onIndexChange={setIndex} /></div>;
}
export const Controlled: Story = { name: '受控索引', render: () => <ControlledExample /> };
export const Imperative: Story = {
  name: '函数式调用',
  render: () => <Button intent="brand" onClick={() => showGallery({ items, defaultIndex: 1, loop: true, closeLabel: 'Close preview' })}>打开画廊</Button>,
};

export const HoverStates: Story = {
  name: '悬停反馈',
  args: { defaultIndex: 1, loop: true },
  render: args => <div className="example-stack">
    <p className="example-note">箭头和缩略图悬停时显示边框；指示器为实心小点，激活项使用主题色。缩略图选中边框会持续保留。键盘 Tab 可检查焦点状态。</p>
    <Gallery {...args} />
    <div className="example-row">
      <Button intent="brand" onClick={() => showGallery({ ...args, closeLabel: 'Close preview' })}>打开弹层，查看关闭按钮状态</Button>
    </div>
  </div>,
};
