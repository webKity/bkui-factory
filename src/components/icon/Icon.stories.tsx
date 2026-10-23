import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BKIcon, figmaIconNames, iconNames } from './index';
import { figmaIcons } from './figma';

const meta = {
  title: '组件/Icon 图标',
  component: BKIcon,
  tags: ['autodocs'],
  args: { name: 'search', variant: 'regular', size: 24, renderInServer: true },
  argTypes: {
    name: { control: 'select', options: iconNames },
    variant: { control: 'inline-radio', options: ['regular', 'filled'] },
    color: { control: 'color' },
    hoverColor: { control: 'color' },
    size: { control: 'text' },
    renderInServer: { control: 'boolean' },
  },
  parameters: {
    docs: { description: { component: '来自 BKDS Web Foundations 的 236 组图标，支持 regular / filled。显式指定 variant 使用 Figma 图标；未指定 variant 的旧名称保留原有图形。默认空闲时加载，renderInServer 可直接输出 SVG。引入 @bkreact/ui/styles.css 使用颜色和 hover 样式。' } },
  },
} satisfies Meta<typeof BKIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Filled: Story = { args: { name: 'bell', variant: 'filled' } };
export const Hover: Story = { args: { name: 'heart', variant: 'filled', color: '#33425b', hoverColor: '#e5484d', size: 32, ariaLabel: '收藏' } };
export const StringSize: Story = { args: { size: '2em' } };
export const Deferred: Story = { args: { renderInServer: false } };
export const Legacy: Story = { args: { name: 'bold', variant: undefined } };

function Gallery() {
  const [query, setQuery] = useState('');
  const matches = figmaIconNames.filter(name => `${name} ${figmaIcons[name].label}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ color: 'var(--color-text-primary, #111)', maxWidth: 1376 }}>
      <h2 style={{ margin: '0 0 8px' }}>BKDS 图标</h2>
      <p>236 组 · 472 个 SVG · 每组左侧 regular，右侧 filled</p>
      <label style={{ display: 'block', marginBottom: 24 }}>
        搜索图标（英文名称 / 中文描述）
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} style={{ display: 'block', marginTop: 8, padding: '10px 12px', width: 'min(100%, 400px)', boxSizing: 'border-box', color: 'inherit', background: 'transparent', border: '1px solid var(--color-border-primary, #ccc)', borderRadius: 6 }} />
      </label>
      <p aria-live="polite">{matches.length} 组图标</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
        {matches.map(name => (
          <div key={name} style={{ border: '1px solid var(--color-border-primary, #ddd)', borderRadius: 8, padding: '20px 12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 14 }}>
              <BKIcon name={name} variant="regular" size={24} renderInServer ariaLabel={`${name} regular`} />
              <BKIcon name={name} variant="filled" size={24} renderInServer ariaLabel={`${name} filled`} />
            </div>
            <code style={{ display: 'block', fontSize: 12, overflowWrap: 'anywhere' }}>{name}</code>
            <span style={{ display: 'block', fontSize: 11, marginTop: 6, opacity: 0.65 }}>{figmaIcons[name].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AllIcons: Story = { render: () => <Gallery />, parameters: { controls: { disable: true } } };
