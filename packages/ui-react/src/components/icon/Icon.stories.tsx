import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BKIcon, figmaIconNames, iconNames } from './index';
import { figmaIcons } from './figma';

const meta = {
  title: '组件/Icon',
  component: BKIcon,
  tags: ['autodocs'],
  args: { name: 'search', variant: 'regular', size: 24, renderInServer: true },
  argTypes: {
    name: { control: 'select', options: iconNames, description: '图标名称，可在全部图标中搜索。' },
    variant: { control: { type: 'inline-radio', labels: { regular: '线性', filled: '实心' } }, options: ['regular', 'filled'], description: '图标样式：线性或实心。' },
    color: { control: 'color', description: '图标颜色，默认继承当前文字颜色。' },
    hoverColor: { control: 'color', description: '鼠标悬停时的图标颜色。' },
    size: { control: 'text', description: '图标尺寸，支持像素数值、相对单位和响应式对象。' },
    renderInServer: { control: 'boolean', description: '立即输出图标，便于服务端渲染；关闭后在空闲时加载。' },
  },
  parameters: {
    docs: { description: { component: '来自 BKDS Web Foundations 的 236 组图标，支持线性与实心两种样式。显式指定样式（variant）使用 Figma 图标；未指定样式的旧名称保留原有图形。默认空闲时加载，renderInServer 可直接输出 SVG。引入 @bkreact/ui/styles.css 使用颜色和悬停样式。' } },
  },
} satisfies Meta<typeof BKIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Filled: Story = { name: '实心图标', args: { name: 'bell', variant: 'filled' } };
export const Hover: Story = { name: '悬停变色', args: { name: 'heart', variant: 'filled', color: '#33425b', hoverColor: '#e5484d', size: 32, ariaLabel: '收藏' } };
export const StringSize: Story = { name: '相对单位尺寸', args: { size: '2em' } };
export const Deferred: Story = { name: '延迟加载', args: { renderInServer: false } };
export const Legacy: Story = { name: '兼容旧版图标', args: { name: 'bold', variant: undefined } };

function Gallery() {
  const [query, setQuery] = useState('');
  const matches = figmaIconNames.filter(name => `${name} ${figmaIcons[name].label}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ color: 'var(--color-text-primary)', maxWidth: 1376 }}>
      <h2 style={{ margin: '0 0 8px' }}>BKDS 图标</h2>
      <p>236 组 · 472 个 SVG · 每组左侧为线性图标，右侧为实心图标</p>
      <label style={{ display: 'block', marginBottom: 24 }}>
        搜索图标（英文名称 / 中文描述）
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} style={{ display: 'block', marginTop: 8, padding: '10px 12px', width: 'min(100%, 400px)', boxSizing: 'border-box', color: 'inherit', background: 'transparent', border: '1px solid var(--color-border-default)', borderRadius: 6 }} />
      </label>
      <p aria-live="polite">{matches.length} 组图标</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
        {matches.map(name => (
          <div key={name} style={{ border: '1px solid var(--color-border-default)', borderRadius: 8, padding: '20px 12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 14 }}>
              <BKIcon name={name} variant="regular" size={24} renderInServer ariaLabel={`${figmaIcons[name].label}（线性）`} />
              <BKIcon name={name} variant="filled" size={24} renderInServer ariaLabel={`${figmaIcons[name].label}（实心）`} />
            </div>
            <code style={{ display: 'block', fontSize: 12, overflowWrap: 'anywhere' }}>{name}</code>
            <span style={{ display: 'block', fontSize: 11, marginTop: 6, opacity: 0.65 }}>{figmaIcons[name].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AllIcons: Story = { name: '全部图标', render: () => <Gallery />, parameters: { controls: { disable: true } } };
