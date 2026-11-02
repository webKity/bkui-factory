import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button';
import { StateMachine } from './index';

type State = 'idle' | 'working' | 'success' | 'failure';
type Action = 'start' | 'finish';
type Mode = 'lifecycle' | 'resolver' | 'concurrent' | 'callback-error' | 'update' | 'initialization-error';
interface DemoProps {
  mode: Mode;
  strict: boolean;
  maxHistory: number;
  accepted: boolean;
}

function StateMachineDemo({ mode, strict, maxHistory, accepted }: DemoProps) {
  const [output, setOutput] = useState('点击运行，查看当前状态、回调顺序和历史记录。每次运行创建独立实例。');
  const [running, setRunning] = useState(false);

  async function execute() {
    setRunning(true);
    const callbacks: string[] = [];
    const observed: State[] = [];
    const results: Record<string, unknown> = {};
    let release = () => {};
    let entered = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const workingEntered = new Promise<void>(resolve => { entered = resolve; });
    let machine: StateMachine<State, Action, { accepted: boolean }> | undefined;
    let unsubscribe = () => {};

    try {
      machine = new StateMachine<State, Action, { accepted: boolean }>({
        initial: 'idle', strict, maxHistory,
        states: {
          idle: {
            onEnter: context => {
              callbacks.push(`${context.action}: enter idle`);
              if (mode === 'initialization-error') throw new Error('初始化失败');
            },
            onExit: context => { callbacks.push(`${context.action}: exit idle`); },
          },
          working: {
            onEnter: async context => {
              callbacks.push(`${context.action}: enter working`);
              if (mode === 'callback-error') throw new Error('working.onEnter 失败');
              if (mode === 'concurrent') { entered(); await gate; }
            },
            onExit: context => { callbacks.push(`${context.action}: exit working`); },
          },
          success: { onEnter: context => { callbacks.push(`${context.action}: enter success`); } },
          failure: { onEnter: context => { callbacks.push(`${context.action}: enter failure`); } },
        },
        transitions: {
          idle: { start: 'working' },
          working: { finish: ({ data }) => data?.accepted ? 'success' : 'failure' },
        },
      });
      const subscription = machine.state$.subscribe(state => observed.push(state));
      unsubscribe = () => subscription.unsubscribe();
      await machine.ready();

      if (mode === 'concurrent') {
        const pending = machine.transition('start');
        // 显式等待进入回调，保证第二次转换发生在第一轮尚未完成时。
        await workingEntered;
        results.isTransitioning = machine.isTransitioning();
        results.canFinishWhileBusy = machine.can('finish');
        try { results.concurrentFinish = await machine.transition('finish'); }
        catch (error) { results.concurrentError = error instanceof Error ? error.message : String(error); }
        release();
        results.firstTransition = await pending;
      } else if (mode === 'callback-error') {
        try { await machine.transition('start'); }
        catch (error) { results.callbackError = error instanceof Error ? error.message : String(error); }
        results.stateAfterError = machine.state;
        results.historyAfterError = machine.history;
        results.reset = await machine.reset();
      } else if (mode === 'update') {
        results.updated = machine.updateCurrentState('success');
        results.isSuccess = machine.is('success');
      } else {
        results.start = await machine.transition('start');
        results.finish = await machine.transition('finish', { accepted });
        results.stateBeforeReset = machine.state;
        if (mode === 'lifecycle') {
          results.historyBeforeReset = machine.history;
          results.reset = await machine.reset();
        }
      }
    } catch (error) {
      results.error = error instanceof Error ? error.message : String(error);
    } finally {
      release();
      if (machine) {
        results.state = machine.state;
        results.ready = machine.isReady();
        results.history = machine.history;
      }
      unsubscribe();
      machine?.dispose();
      setOutput(JSON.stringify({ ...results, callbacks, observed }, null, 2));
      setRunning(false);
    }
  }

  return <section className="example-stack">
    <p>strict: {String(strict)}，maxHistory: {maxHistory}，accepted: {String(accepted)}。</p>
    <Button onClick={execute} disabled={running}>运行状态机示例</Button>
    <pre role="status" aria-live="polite">{output}</pre>
  </section>;
}

const meta = {
  title: '工具与服务/StateMachine',
  component: StateMachineDemo,
  args: { mode: 'lifecycle', strict: false, maxHistory: 10, accepted: true },
  argTypes: {
    mode: { control: false, table: { disable: true } },
    strict: { control: 'boolean', description: '非法动作或正在转换时再次操作：false 返回 false，true 拒绝 Promise。' },
    maxHistory: { control: { type: 'number', min: 0, step: 1 }, description: '历史记录容量；0 关闭记录，未配置时不限量。' },
    accepted: { control: 'boolean', description: '传给 finish resolver 的数据，决定进入 success 或 failure。' },
  },
} satisfies Meta<typeof StateMachineDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Lifecycle: Story = {
  name: '状态转换、订阅与重置',
  parameters: { docs: { description: { story: '等待 ready，依次执行 start、finish 和 reset，观察回调顺序与 state$ 通知。reset 后历史仅保留 RESET（maxHistory 为 0 时为空）。' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行状态机示例' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('"reset": true'));
  },
};

export const DynamicTarget: Story = {
  name: '动态目标与业务数据',
  args: { mode: 'resolver' },
  parameters: { docs: { description: { story: 'finish 的同步 resolver 根据 data.accepted 选择 success 或 failure；通过 Controls 修改 accepted 后重新运行。' } } },
};

export const ConcurrentTransition: Story = {
  name: '异步回调与并发保护',
  args: { mode: 'concurrent' },
  parameters: { docs: { description: { story: 'working.onEnter 等待一个可控 Promise。期间第二次转换返回 false；开启 strict 时拒绝。第一轮解除等待后正常完成，第二个动作不会自动排队。' } } },
};

export const CallbackError: Story = {
  name: '进入回调失败后的状态',
  args: { mode: 'callback-error' },
  parameters: { docs: { description: { story: 'working.onEnter 抛错时，状态与历史已更新。捕获错误后展示现场，并通过 reset 返回初始状态。' } } },
};

export const DirectUpdate: Story = {
  name: '直接更新状态',
  args: { mode: 'update' },
  parameters: { docs: { description: { story: 'updateCurrentState 直接进入 success，state$ 收到通知，但不触发转换回调、不追加历史。' } } },
};

export const InitializationError: Story = {
  name: '初始化失败',
  args: { mode: 'initialization-error' },
  parameters: { docs: { description: { story: '初始 onEnter 抛错后 ready() 拒绝，isReady() 为 false，INIT 历史不会写入。示例捕获并展示错误。' } } },
};
