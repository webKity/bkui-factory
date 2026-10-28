import { DEFAULT_NOTIFICATION_DURATION, Notification, NotificationProvider, useNotification } from './index';
import { Button } from '../button';
import type { NotificationPosition } from './type';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: '组件/Notification',
  component: Notification,
  tags: ['autodocs'],
  args: { item: { id: 'preview', title: '操作成功', message: '你的更改已保存。', intent: 'success' }, onClose: () => {} },
  parameters: { docs: { description: { component: `Notification 为受控卡片。使用 NotificationProvider 包裹应用后，通过 useNotification 获取 showNotification 和 closeNotification。默认右上角显示，${DEFAULT_NOTIFICATION_DURATION}ms 自动关闭；duration <= 0 保持显示。通知前方显示对应意图图标，底部进度条随倒计时从左向右填满，持续显示的通知无进度条。关闭先播放退场动画，再移除卡片。` } } },
} satisfies Meta<typeof Notification>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Intents: Story = {
  name: '五种意图',
  render: () => <div style={{ display: 'grid', gap: 16 }}>{(['normal', 'brand', 'success', 'warning', 'danger'] as const).map(intent => (
    <Notification key={intent} item={{ id: intent, title: intent, message: '通知内容支持长文本自动换行。', intent }} onClose={() => {}} />
  ))}</div>,
};
export const Actions: Story = {
  name: '自定义内容与操作',
  args: { item: { id: 'actions', title: '更新可用', message: '现在可以升级到新版本。', children: <a href="#details">查看更新说明</a>, actions: [{ label: '稍后', variant: 'ghost' }, { label: '立即更新', intent: 'brand', variant: 'fill' }] } },
};

function Demo() {
  const { showNotification, closeNotification } = useNotification();
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as NotificationPosition[]).map(position => (
      <Button key={position} onClick={() => showNotification({ position, title: position, message: `这条通知将在 ${DEFAULT_NOTIFICATION_DURATION / 1000} 秒后关闭。`, intent: 'success' })}>{position}</Button>
    ))}
    <Button onClick={() => {
      const id = showNotification({ title: '需要确认', message: '此通知保持显示，直到手动关闭。', duration: 0,
        actions: [{ label: '确认', intent: 'brand', onClick: () => closeNotification(id) }] });
    }}>持久通知</Button>
  </div>;
}
export const Provider: Story = {
  name: '四角堆叠与定时关闭',
  render: () => <NotificationProvider><Demo /></NotificationProvider>,
};
