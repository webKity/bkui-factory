import type { Meta, StoryObj } from '@storybook/react-vite';
import colorCss from '../packages/ui-react/src/components/themes/light/semantic/colors.css?raw';

const colors = [...colorCss.matchAll(/(--color-[a-z0-9-]+):/g)].map(match => match[1]);
const radii = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];
const sizes = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];

const meta = { title: '设计变量/Semantic', parameters: { controls: { disable: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Colors: Story = {
  name: '语义颜色',
  render: () => <div className="example-token-grid">{colors.map(name => <div className="example-token" key={name}>
    <div className="example-swatch" style={{ backgroundColor: `var(${name})` }} />
    <code>{name}</code>
  </div>)}</div>,
};
export const Typography: Story = {
  name: '字体与字号',
  render: () => <div className="example-stack">
    {['zh', 'en', 'numeric'].map(mode => <div className="example-item" key={mode}>
      <code className="example-caption">--font-family-{mode}</code>
      <div style={{ fontFamily: `var(--font-family-${mode})`, fontSize: 24 }}>组件设计 Button 0123456789</div>
    </div>)}
    {sizes.map(size => <div className="example-item" key={size}><code className="example-caption">--text-{size}-size / --text-{size}-line-height</code>
      <div style={{ fontSize: `var(--text-${size}-size)`, lineHeight: `var(--text-${size}-line-height)` }}>组件库的尺寸与排版 Typography</div>
    </div>)}
  </div>,
};
export const Radius: Story = {
  name: '圆角',
  render: () => <div className="example-token-grid">{radii.map(radius => <div className="example-token" key={radius}>
    <div className="example-swatch" style={{ borderRadius: `var(--radius-scale-${radius})`, backgroundColor: 'var(--color-fill-selected)' }} />
    <code>--radius-scale-{radius}</code>
  </div>)}</div>,
};
