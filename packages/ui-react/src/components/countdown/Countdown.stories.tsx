import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Countdown } from './index';
import { Button } from '../button';
import './examples.css';

const meta = {
  title: '组件/Countdown',
  component: Countdown,
  tags: ['autodocs'],
  args: { duration: 3661, scene: 'alarm', animation: 'none' },
  argTypes: {
    scene: { control: 'select', options: ['alarm', 'day', 'date', 'otp', 'custom'] },
    animation: { control: 'inline-radio', options: ['none', 'flip', 'wheel'] },
    duration: { control: { type: 'number', min: 0 } },
    targetTime: { control: 'date' },
    value: { control: 'number' },
    render: { control: false },
    children: { control: false },
  },
  parameters: {
    docs: { description: { component:
      '优先级为 value（毫秒）> targetTime（日期、日期字符串、秒或毫秒时间戳）> duration（秒）。' +
      'value 为纯展示模式，不触发计时回调。autoStart=false 固定初始剩余时间，改回 true 后时长重新开始；目标时间仍按绝对时间计算。' +
      'alarm 默认时分秒，otp 默认总秒数，day/date/custom 自动显示天（如有）及时间。' +
      'showZeroUnits=false 隐藏前导零单位，units 显式指定时按天、时、分、秒顺序展示。' +
      '支持 render/children 自定义布局和 --countdown-* CSS 变量；默认不实时播报每次更新，尊重减少动态效果设置。',
    } },
  },
} satisfies Meta<typeof Countdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const Days: Story = { name: '按天倒计时', args: { duration: 2 * 86400 + 3661, scene: 'day' } };
export const Deadline: Story = {
  name: '活动截止时间',
  render: args => {
    const [targetTime] = useState(() => Date.now() + 86400000);
    return <Countdown {...args} scene="date" targetTime={targetTime} />;
  },
};
export const Animations: Story = {
  name: '数字动画',
  render: args => <div className="countdown-examples">
    {(['none', 'flip', 'wheel'] as const).map(animation => (
      <Countdown {...args} key={animation} animation={animation} aria-label={animation} />
    ))}
  </div>,
};
export const OTP: Story = {
  name: '验证码倒计时与重发',
  render: () => {
    const [key, setKey] = useState(0);
    const [finished, setFinished] = useState(false);
    return <div className="countdown-examples">
      <Countdown key={key} className="countdown-example-otp" scene="otp" duration={60} showLabels expiredText="可重新发送" onFinish={() => setFinished(true)} />
      <Button disabled={!finished} onClick={() => { setFinished(false); setKey(key + 1); }}>重新发送</Button>
    </div>;
  },
};
export const Controlled: Story = { name: '受控剩余时间', args: { value: 90000, units: ['minutes', 'seconds'] } };
export const Finished: Story = { name: '结束文案', args: { value: 0, expiredText: '活动已结束' } };
export const Custom: Story = {
  name: '自定义渲染',
  args: { scene: 'custom', duration: 90, units: ['seconds'] },
  render: args => <Countdown {...args}>
    {(_parts, items, { renderDigit, finished }) => finished ? '现在开始' : <span>距离开始还有 {renderDigit(items[0])} 秒</span>}
  </Countdown>,
};
