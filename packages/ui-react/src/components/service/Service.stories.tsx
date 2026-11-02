import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button';
import { LRUTTLCacheService } from './lru.ttl.cache';
import { TaskQueue } from './task.queue';

function CacheDemo({ maxSize, ttl }: { maxSize: number; ttl: number }) {
  const [cache] = useState(() => new LRUTTLCacheService<number>({ maxSize, ttl }));
  const [output, setOutput] = useState('依次写入 a、b，读取 a，再写入 c，观察容量与 LRU 淘汰。');

  function show(action: string) {
    const sizeBeforePrune = cache.size;
    const entries: Record<string, number> = {};
    cache.forEach((value, key) => { entries[key] = value; });
    setOutput(JSON.stringify({ action, sizeBeforePrune, validCount: cache.count(), entries }, null, 2));
  }

  function fill() {
    cache.clear();
    cache.configure({ maxSize, ttl });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    show('写入并读取完成');
  }

  return <section className="example-stack">
    <p>容量 {maxSize}，TTL {ttl} 毫秒（0 表示不过期）。修改 Controls 后点击“运行缓存示例”应用配置。</p>
    <div className="flex flex-wrap gap-2">
      <Button onClick={fill}>运行缓存示例</Button>
      <Button variant="outline" onClick={() => show('清理并检查有效条目')}>检查过期条目</Button>
      <Button variant="outline" onClick={() => { cache.clear(); show('已清空'); }}>清空缓存</Button>
    </div>
    <pre role="status" aria-live="polite">{output}</pre>
  </section>;
}

function QueueDemo({ mode }: { mode: 'sync' | 'async' | 'error' }) {
  const [output, setOutput] = useState('点击运行，查看任务顺序与数据传递结果。');
  const [running, setRunning] = useState(false);

  async function execute() {
    setRunning(true);
    const steps: string[] = [];
    const queue = new TaskQueue<number>();
    try {
      if (mode === 'sync') {
        queue.use((value, next) => {
          steps.push(`第一步：${value} + 1`);
          next(value + 1);
        });
        queue.use((value, next) => {
          steps.push(`第二步：${value} × 2`);
          next(value * 2);
        });
        queue.use((value, next) => { steps.push(`最终结果：${value}`); next(value); });
        queue.run(2);
        setOutput(JSON.stringify({ steps, registeredTasks: queue.size }, null, 2));
      } else {
        queue.use(async (value, next) => {
          await Promise.resolve();
          steps.push(`异步第一步：${value} + 1`);
          next(value + 1);
        });
        queue.use(async value => {
          steps.push(`第二步：接收 ${value}，未调用 next，Promise 完成后保留当前值`);
          if (mode === 'error') throw new Error('模拟任务失败');
        });
        queue.use((value, next) => {
          steps.push(`第三步：${value} × 2`);
          next(value * 2);
        });
        const result = await queue.runAsync(2);
        setOutput(JSON.stringify({ steps, result, registeredTasks: queue.size }, null, 2));
      }
    } catch (error) {
      setOutput(JSON.stringify({ steps, error: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally {
      setRunning(false);
    }
  }

  return <section className="example-stack">
    <Button onClick={execute} disabled={running}>运行任务队列</Button>
    <pre role="status" aria-live="polite">{output}</pre>
  </section>;
}

const meta = {
  title: '工具与服务/Service',
  component: CacheDemo,
  args: { maxSize: 2, ttl: 0 },
  argTypes: {
    maxSize: { control: { type: 'number', min: 1, step: 1 }, description: '缓存最大条目数，超出后先清理过期项，再按 LRU 淘汰。' },
    ttl: { control: { type: 'number', min: 0 }, description: '写入后有效期（毫秒），0 表示不过期。' },
  },
} satisfies Meta<typeof CacheDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Cache: Story = {
  name: 'LRU 缓存与容量淘汰',
  parameters: { docs: { description: { story: '默认容量为 2。写入 a、b 后读取 a，再写入 c，最终保留 a、c。可通过 Controls 调整容量和 TTL，再次运行。' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行缓存示例' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('"a": 1');
    await expect(canvas.getByRole('status')).toHaveTextContent('"c": 3');
    await expect(canvas.getByRole('status')).not.toHaveTextContent('"b": 2');
  },
};

export const Expiration: Story = {
  name: 'TTL 过期与主动清理',
  args: { maxSize: 3, ttl: 1000 },
  parameters: { docs: { description: { story: '运行后等待至少 1 秒，点击“检查过期条目”。sizeBeforePrune 仍可能包含过期项，forEach 和 count 执行清理后有效条目数为 0。' } } },
};

export const SyncQueue: Story = {
  name: '同步任务链',
  parameters: { controls: { disable: true }, docs: { description: { story: 'run 通过 next 显式推进：初始值 2 加 1 后乘 2，最终为 6。执行不消费任务，重复点击会创建新队列重跑。' } } },
  render: () => <QueueDemo mode="sync" />,
};

export const AsyncQueue: Story = {
  name: '异步任务与数据传递',
  parameters: { controls: { disable: true }, docs: { description: { story: 'runAsync 等待任务结算。第二步返回 Promise 且未调用 next，因此保留输入值 3，第三步得到结果 6。' } } },
  render: () => <QueueDemo mode="async" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行任务队列' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('"result": 6'));
  },
};

export const QueueError: Story = {
  name: '任务失败与中断',
  parameters: { controls: { disable: true }, docs: { description: { story: '第二步返回 rejected Promise，runAsync 拒绝并停止执行后续任务。示例在调用方捕获并展示错误。' } } },
  render: () => <QueueDemo mode="error" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行任务队列' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('模拟任务失败'));
    await expect(canvas.getByRole('status')).not.toHaveTextContent('第三步');
  },
};
