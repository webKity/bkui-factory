import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './index';
import type { ButtonProps } from './type';
import type { IBKIntent, IBKSize, IBKVariants } from '../types/base';

const intents: IBKIntent[] = ['normal', 'info', 'success', 'warning', 'error'];
const variants: IBKVariants[] = ['fill', 'line', 'ghost'];
const sizes: IBKSize[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];
const arrow = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M8 3l5 5-5 5" /></svg>;

// Storybook 的单一组件签名需要适配 Button 的 button / anchor 两个 ref 重载。
const ButtonExample = Button as ComponentType<ButtonProps>;

const meta = {
  title: '组件/Button',
  component: ButtonExample,
  tags: ['autodocs'],
  args: { children: '确认操作', intent: 'info', variant: 'fill', size: 'base', disabled: false, loading: false, block: false, round: false, onClick: fn() },
  argTypes: {
    children: { control: 'text', description: '按钮文案或自定义内容。' },
    intent: { control: 'select', options: intents, description: '视觉意图；组件默认 normal。' },
    variant: { control: 'inline-radio', options: variants, description: '填充、描边或无边框按钮。' },
    size: { control: 'select', options: sizes, description: '七档尺寸，也支持 sm/md/lg/xl/2xl 响应式对象。' },
    disabled: { control: 'boolean', description: '禁用交互；原生按钮使用 disabled。' },
    loading: { control: 'boolean', description: 'Loading 替换前置图标，保留文案、后置图标和焦点，并阻止重复触发。' },
    block: { control: 'boolean', description: '占据容器整行宽度。' },
    round: { control: 'boolean', description: '使用胶囊圆角。' },
    link: { control: 'text', description: '提供时渲染原生 a；disabled/loading 时移除 href。' },
    prefixIcon: { control: false, description: '前置装饰图标，loading 时由 Loading 替换。' },
    suffixIcon: { control: false, description: '后置装饰图标。' },
    onClick: { control: false, description: '点击事件，事件元素类型随 link 区分。' },
  },
  parameters: {
    docs: {
      description: { component: '基于 Base UI 的按钮。样式只消费局部 --button-* tokens，主题由 html 的 theme 属性切换。顶部工具栏可切换主题；Controls 可以实时修改当前示例。' },
      source: { transform: (source: string) => source.replace(/\bButtonExample\b/g, 'Button') },
    },
  },
} satisfies Meta<ButtonProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  name: '可调试用例',
};

export const ClickInteraction: Story = {
  name: '测试：点击响应',
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: '确认操作' });
    await expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const VariantMatrix: Story = {
  name: '变体与意图',
  render: () => <div className="example-matrix"><table>
    <thead><tr><th>variant / intent</th>{intents.map(intent => <th key={intent}>{intent}</th>)}</tr></thead>
    <tbody>{variants.map(variant => <tr key={variant}><th>{variant}</th>{intents.map(intent => <td key={intent}><Button intent={intent} variant={variant}>继续操作</Button></td>)}</tr>)}</tbody>
  </table></div>,
};

export const Sizes: Story = {
  name: '七档尺寸',
  render: () => <div className="example-row">{sizes.map(size => <div className="example-item" key={size}>
    <Button intent="info" size={size} prefixIcon={arrow}>继续</Button><code className="example-caption">{size}</code>
  </div>)}</div>,
};

export const States: Story = {
  name: '状态与图标',
  render: () => <div className="example-stack">
    <div className="example-row"><Button intent="info">默认</Button><Button intent="info" disabled>已禁用</Button><Button intent="info" loading>提交中</Button><Button intent="info" round>胶囊按钮</Button></div>
    <div className="example-row"><Button prefixIcon={arrow}>前置图标</Button><Button suffixIcon={arrow}>后置图标</Button><Button prefixIcon={arrow} suffixIcon={arrow} loading>图标与加载</Button><Button aria-label="继续" prefixIcon={arrow} round /></div>
    <Button intent="info" block>整行按钮</Button>
  </div>,
};

export const Disabled: Story = {
  name: '测试：禁用不触发点击',
  args: { children: '已禁用', disabled: true, onClick: fn() },
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: '已禁用' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

function LoadingExample() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('等待提交');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <div className="example-stack">
    <div><Button intent="info" loading={loading} prefixIcon={<span data-testid="loading-prefix">→</span>} onClick={() => {
      setLoading(true);
      setResult('提交中，请等待…');
      timer.current = setTimeout(() => { setLoading(false); setResult('提交完成，可以再次操作'); }, 1000);
    }}>提交订单</Button></div>
    <p className="example-status" role="status">{result}</p>
  </div>;
}
export const LoadingCycle: Story = {
  name: '测试：加载与焦点恢复',
  render: () => <LoadingExample />,
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '提交订单' });
    await expect(canvas.getByTestId('loading-prefix')).toBeVisible();
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveFocus();
    await expect(canvas.queryByTestId('loading-prefix')).not.toBeInTheDocument();
    await expect(canvas.getByRole('status')).toHaveTextContent('提交中');
    await expect(canvas.findByText('提交完成，可以再次操作', {}, { timeout: 3000 })).resolves.toBeVisible();
    await expect(button).not.toHaveAttribute('aria-busy');
    await expect(canvas.getByTestId('loading-prefix')).toBeVisible();
  },
};

function LoadingAnimationExample() {
  const [loading, setLoading] = useState(false);
  return <div className="example-stack">
    <div><Button variant="line" onClick={() => setLoading(value => !value)}>{loading ? '退出 loading' : '进入 loading'}</Button></div>
    <div className="example-row">
      <Button intent="info" loading={loading}>提交订单</Button>
      <Button intent="info" prefixIcon={arrow} loading={loading}>已有前置图标</Button>
      <Button link="#loading-animation" loading={loading}>链接按钮</Button>
    </div>
    <Button intent="info" block loading={loading}>整行按钮</Button>
    <p className="example-note" id="loading-animation">无前置图标时平滑展开和收起；已有前置图标时原位替换。整行按钮保持宽度，内部内容平滑移动。系统开启减少动态效果时关闭过渡。</p>
  </div>;
}

export const LoadingAnimation: Story = {
  name: '加载伸缩动画',
  render: () => <LoadingAnimationExample />,
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '提交订单' });
    await expect(button).not.toHaveAttribute('aria-busy');
    await userEvent.click(canvas.getByRole('button', { name: '进入 loading' }));
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveAttribute('data-loading');
    await userEvent.click(canvas.getByRole('button', { name: '退出 loading' }));
    await expect(button).not.toHaveAttribute('aria-busy');
  },
};

export const Links: Story = {
  name: '链接与禁用链接',
  render: () => <div className="example-stack">
    <div className="example-row"><Button link="#button-link-target" variant="line">跳到示例位置</Button><Button link="#button-link-target" disabled>禁用链接</Button><Button link="#button-link-target" loading>加载中的链接</Button></div>
    <p id="button-link-target" className="example-note">链接保留原生导航语义，禁用或加载时不可导航。</p>
  </div>,
};

export const Responsive: Story = {
  name: '响应式尺寸',
  render: () => <div className="example-stack">
    <p className="example-note">调整浏览器宽度或使用视口工具。移动端为 base；≥40rem 为 xs；≥64rem 为 lg；≥96rem 为 2xl。未指定的断点沿用较小断点。</p>
    <Button intent="info" block size={{ sm: 'xs', lg: 'lg', '2xl': '2xl' }}>响应式按钮</Button>
  </div>,
};

function FormExample() {
  const [count, setCount] = useState(0);
  return <form className="example-stack" onSubmit={event => { event.preventDefault(); setCount(value => value + 1); }}>
    <div className="example-row"><Button>普通按钮</Button><Button type="submit" intent="info">提交表单</Button></div>
    <output role="status">已提交 {count} 次</output>
  </form>;
}
export const FormSubmission: Story = {
  name: '测试：原生表单提交',
  render: () => <FormExample />,
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '普通按钮' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('已提交 0 次');
    await userEvent.click(canvas.getByRole('button', { name: '提交表单' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('已提交 1 次');
  },
};

export const CustomTokens: Story = {
  name: '组件 tokens 覆盖',
  render: () => <div className="example-stack">
    <div><Button className="example-custom-button" intent="info">自定义组件 tokens</Button></div>
    <pre className="example-code">{`.example-custom-button {\n  --button-border-radius: 4px;\n  --button-font-weight: 700;\n  --button-bg: var(--color-feedback-success);\n  --button-hover-bg: var(--color-feedback-info);\n}`}</pre>
  </div>,
};
