import { useEffect, useState } from 'react';
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
      'value 为纯展示模式，不触发计时回调；移除后按当前来源重新开始。autoStart=false 固定初始值，切回 true 后重新开始。' +
      '修改 interval 仅改变更新节奏；onChange 不同步通知初始值；零时长或已过期来源会在挂载后异步 tick 通知 0，再触发 onFinish（autoStart=false 除外）。duration 换算后四舍五入至整数毫秒。targetTime 首次 SSR 与 hydration 输出空占位，挂载后计算实际值。' +
      '数字时间戳请传 number，字符串请传 ISO 日期；非法日期和数字字符串按过期处理。' +
      'alarm 为累计小时的时分秒（两天显示 48:00:00），otp 为总秒数；day/date/custom 固定显示天、时、分、秒，避免跨天时布局跳变。' +
      'showZeroUnits=false 隐藏前导零单位，units 显式指定时按天、时、分、秒顺序展示。' +
      '完成时非空 expiredText 优先于 render/children；null/undefined 回退到自定义或默认内容。separator 为 null/布尔值/空字符串时不占位。' +
      '支持 render/children 和 --countdown-* CSS 变量；默认仅在自动计时的到期 tick 后通过独立状态节点播报一次，冻结配置变更和受控归零不会播报。显式 aria-live 覆盖默认播报策略。尊重减少动态效果设置。' +
      'useCountdown 返回 running（自动计时状态）和 completionCount（真实到期 tick 次数）。重新发送可通过改变 key 重挂载，暂不提供 restart/reset 方法。',
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
      <Countdown {...args} key={animation} animation={animation} aria-label={animation} aria-live="off" />
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
      <Button disabled={!finished} onClick={() => { setFinished(false); setKey(current => current + 1); }}>重新发送</Button>
    </div>;
  },
};
export const Controlled: Story = { name: '受控剩余时间', args: { value: 90000, units: ['minutes', 'seconds'] } };
export const Increasing: Story = {
  name: '数字递增',
  args: { scene: 'otp', animation: 'wheel', units: ['seconds'], showLabels: false },
  parameters: {
    docs: { description: { story:
      '使用受控 value 展示递增数字，由外部状态每秒加 1；组件只负责展示和数字切换动画。' +
      'value 的单位仍为毫秒，因此数字 count 需要传入 count * 1000，并通过 units={["seconds"]} 展示总数。' +
      '可暂停、手动加 1 或重置，也可在 Controls 中将 animation 切换为 flip 查看翻页效果。' +
      '受控模式不触发 onChange/onFinish；示例通过 aria-live="off" 关闭完成播报。',
    } },
  },
  render: args => {
    const [count, setCount] = useState(8);
    const [running, setRunning] = useState(true);
    useEffect(() => {
      if (!running) return;
      const timer = setInterval(() => setCount(current => current + 1), 1000);
      return () => clearInterval(timer);
    }, [running]);

    return <div className="countdown-examples">
      <Countdown {...args} value={count * 1000} aria-label="递增数字" aria-live="off" />
      <Button onClick={() => setRunning(current => !current)}>{running ? '暂停' : '继续'}</Button>
      <Button onClick={() => setCount(current => current + 1)}>加 1</Button>
      <Button onClick={() => setCount(8)}>重置</Button>
    </div>;
  },
};
export const Finished: Story = { name: '结束文案', args: { value: 0, expiredText: '活动已结束' } };
export const Custom: Story = {
  name: '自定义渲染',
  args: { scene: 'custom', duration: 90, units: ['seconds'] },
  render: args => <Countdown {...args}>
    {(_parts, items, { renderDigit, finished }) => finished ? '现在开始' : <span>距离开始还有 {renderDigit(items[0])} 秒</span>}
  </Countdown>,
};

export const Timestamps: Story = {
  name: '秒与毫秒时间戳',
  render: args => {
    const [deadline] = useState(() => Math.floor(Date.now() / 1000) * 1000 + 3600000);
    return <div className="countdown-examples">
      <Countdown {...args} targetTime={deadline / 1000} aria-label="秒时间戳" aria-live="off" />
      <Countdown {...args} targetTime={deadline} aria-label="毫秒时间戳" aria-live="off" />
    </div>;
  },
};
export const AcrossDays: Story = {
  name: '累计小时与固定天单位',
  render: args => <div className="countdown-examples">
    <Countdown {...args} scene="alarm" value={172800000} aria-label="累计小时" />
    <Countdown {...args} scene="day" value={60000} aria-label="保留零天" />
  </div>,
};
