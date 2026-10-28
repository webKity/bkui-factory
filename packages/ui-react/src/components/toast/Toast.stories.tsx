import { useState } from 'react';
import { Toast, showToast } from './index';
import { Button } from '../button';
import { BKIcon } from '../icon';
import type { ToastProps } from './type';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: '组件/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: { msg: '操作成功，你的更改已保存。', intent: 'success', duration: 3000 },
  parameters: { docs: { description: { component: 'Toast 通过 Portal 显示在页面顶部中央。默认 3 秒自动关闭，duration <= 0 持续显示。visible 控制显示，重新打开或更新 msg / duration 会重新计时。自动关闭会调用 onClose，父组件可在回调中同步 visible。icon 支持自定义，null 隐藏图标。' } } },
  render: args => <Demo {...args} />,
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo(props: ToastProps) {
  const [visible, setVisible] = useState(false);
  return <>
    <Button onClick={() => setVisible(current => !current)}>{visible ? '隐藏提示' : '显示提示'}</Button>
    <Toast {...props} visible={visible && props.visible !== false} onClose={() => { setVisible(false); props.onClose?.(); }} />
  </>;
}

export const Playground: Story = { name: '可调试用例' };
export const FunctionCall: Story = {
  name: '函数调用',
  parameters: { docs: { description: { story: 'showToast(config) 无需挂载组件，返回关闭函数。连续调用会替换上一条提示；自动关闭、手动关闭或替换时，onClose 只调用一次。' } } },
  render: args => <Button onClick={() => showToast(args)}>调用 showToast</Button>,
};
export const FunctionClose: Story = {
  name: '函数调用与手动关闭',
  render: args => {
    const [close, setClose] = useState<(() => void) | null>(null);
    return <div style={{ display: 'flex', gap: 12 }}>
      <Button onClick={() => {
        const dismiss = showToast({ ...args, duration: 0 });
        setClose(() => dismiss);
      }}>显示持续提示</Button>
      <Button onClick={() => { close?.(); setClose(null); }} disabled={!close}>关闭提示</Button>
    </div>;
  },
};
export const Persistent: Story = { name: '持续显示', args: { duration: 0 } };
export const LongMessage: Story = { name: '长文本', args: { msg: '这是一条较长的提示信息，用于展示窄屏下的自动换行。'.repeat(8), duration: 0 } };
export const CustomIcon: Story = { name: '自定义图标', args: { icon: <BKIcon name="info-circle" size="100%" renderInServer /> } };
export const WithoutIcon: Story = { name: '纯文本', args: { icon: null } };
export const Intents: Story = {
  name: '五种意图',
  render: args => {
    const [intent, setIntent] = useState<ToastProps['intent']>();
    return <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['normal', 'brand', 'success', 'warning', 'danger'] as const).map(value =>
          <Button key={value} intent={value} onClick={() => setIntent(value)}>{value}</Button>)}
      </div>
      {intent && <Toast {...args} key={intent} intent={intent} msg={`${intent} 提示信息`} onClose={() => setIntent(undefined)} />}
    </>;
  },
};
