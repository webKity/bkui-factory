import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button';
import { createHttpClient, HttpError, HttpTimeoutError } from './index';
import type { HttpResponseType } from './type';
import documentation from './README.md?raw';

type Client = ReturnType<typeof createHttpClient>;
type Run = (track: (client: Client) => Client) => Promise<unknown>;

// 所有示例仅使用本地模拟传输，不访问业务接口。
function transport(delay = 80, status = 200): typeof fetch {
  let count = 0;
  return async (url, init) => {
    await new Promise<void>((resolve, reject) => {
      const signal = init?.signal;
      const abort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, delay);
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    });
    return Response.json({
      url: String(url), method: init?.method, body: init?.body ?? null,
      authorization: new Headers(init?.headers).get('authorization'),
      networkCall: ++count,
    }, { status });
  };
}

function Demo({ run, label = '运行示例' }: { run: Run; label?: string }) {
  const clients = useRef<Client[]>([]);
  const generation = useRef(0);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('点击按钮查看结果；请求使用本地模拟传输。');
  const cancel = () => clients.current.forEach(client => client.cancelAll());
  useEffect(() => () => {
    generation.current++;
    clients.current.forEach(client => client.cancelAll());
  }, []);
  async function execute() {
    const current = ++generation.current;
    cancel();
    clients.current = [];
    setRunning(true);
    try {
      const result = await run(client => { clients.current.push(client); return client; });
      if (current === generation.current) setOutput(JSON.stringify(result, null, 2) ?? 'undefined');
    } catch (error) {
      if (current === generation.current) setOutput(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    } finally {
      if (current === generation.current) setRunning(false);
    }
  }
  return <section>
    <div className="flex gap-2">
      <Button onClick={execute} disabled={running}>{label}</Button>
      <Button onClick={cancel} disabled={!running} variant="outline">取消进行中的请求</Button>
    </div>
    <pre role="status" aria-live="polite">{output}</pre>
  </section>;
}

interface PlaygroundProps {
  timeout: number;
  delay: number;
  responseType: HttpResponseType;
}
function PlaygroundDemo({ timeout, delay, responseType }: PlaygroundProps) {
  return <Demo run={async track => {
    const api = track(createHttpClient({ baseURL: 'https://example.com/api/', timeout, fetch: transport(delay) }));
    const task = api.get('users', { responseType, params: { page: 2, tags: ['active', 'verified'] } });
    const response = await task;
    return { requestId: task.requestId, status: response.status, fromCache: response.fromCache, data: response.data instanceof Blob
      ? { type: response.data.type, size: response.data.size }
      : response.data instanceof ArrayBuffer ? { byteLength: response.data.byteLength } : response.data };
  }} />;
}

const meta = {
  title: '工具与服务/HTTP',
  component: PlaygroundDemo,
  tags: ['autodocs'],
  args: { timeout: 1000, delay: 80, responseType: 'auto' },
  argTypes: {
    timeout: { control: { type: 'number', min: 0 }, description: '请求超时毫秒数；0 表示不设超时，包含拦截器与响应解析。' },
    delay: { control: { type: 'number', min: 0 }, description: '本地模拟网络延迟（毫秒），可调大以验证超时和取消。' },
    responseType: { control: 'select', options: ['auto', 'json', 'text', 'blob', 'arrayBuffer'], description: '响应体解析方式，默认 auto 根据 Content-Type 选择 JSON 或文本。' },
  },
  parameters: { docs: { description: { component: documentation } } },
} satisfies Meta<typeof PlaygroundDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  name: '可调试用例',
  parameters: { docs: { description: { story: '通过 Controls 调整超时、模拟延迟和解析方式后运行。所有请求使用本地模拟 Fetch。' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行示例' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('networkCall'));
  },
};

export const RequestBody: Story = {
  name: '查询参数与 JSON 请求体',
  parameters: { controls: { disable: true }, docs: { description: { story: 'POST 的第二个参数是配置对象，通过 json 发送数据。数组查询参数重复编码，同名参数覆盖 URL 原值，null 参数忽略。结果展示最终 URL、方法与序列化请求体。' } } },
  render: () => <Demo run={async track => {
    const api = track(createHttpClient({ baseURL: 'https://example.com/api/', fetch: transport() }));
    return (await api.post('users?page=1', {
      params: { page: 2, tags: ['active', 'verified'], omitted: null },
      json: { name: '小明' },
    })).data;
  }} />,
};

export const Interceptors: Story = {
  name: '拦截器与业务数据转换',
  parameters: { controls: { disable: true }, docs: { description: { story: '按顺序异步执行请求、响应拦截器。请求拦截器加入鉴权头；响应拦截器转换 data 并记录步骤。每次运行创建独立实例，避免重复注册。' } } },
  render: () => <Demo run={async track => {
    const events: string[] = [];
    const api = track(createHttpClient({ baseURL: 'https://example.com/api/', fetch: transport() }));
    api.interceptors.request.use(async config => {
      events.push('请求拦截器');
      const headers = new Headers(config.headers);
      headers.set('Authorization', 'Bearer demo-token');
      return { ...config, headers };
    });
    api.interceptors.response.use(response => {
      events.push('响应拦截器');
      return { ...response, data: { transformed: true, original: response.data } };
    });
    const response = await api.get('users');
    return { events, data: response.data, requestId: response.requestId };
  }} />,
};

export const Cache: Story = {
  name: '缓存命中与清空',
  parameters: { controls: { disable: true }, docs: { description: { story: '依次执行首次请求、命中缓存、跳过缓存和清空后请求。观察 fromCache、networkCall 与每次独立的 requestId。缓存命中不发送 Fetch。' } } },
  render: () => <Demo run={async track => {
    const api = track(createHttpClient({ baseURL: 'https://example.com/api/', cache: { ttl: 30_000 }, fetch: transport() }));
    const first = await api.get('users');
    const hit = await api.get('users');
    const bypass = await api.get('users', { cache: false });
    api.clearCache();
    const cleared = await api.get('users');
    return [first, hit, bypass, cleared].map(({ data, fromCache, requestId }) => ({ data, fromCache, requestId }));
  }} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '运行示例' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('"fromCache": true'));
  },
};

export const Timeout: Story = {
  name: '超时处理',
  args: { timeout: 100, delay: 1000 },
  parameters: { docs: { description: { story: '模拟延迟超过 timeout 时显示 TimeoutError。通过 Controls 调整两个值可观察成功与超时；0 表示不设超时。' } } },
};

export const Cancellation: Story = {
  name: '取消请求',
  args: { timeout: 0, delay: 3000 },
  parameters: { docs: { description: { story: '点击运行后，在响应返回前点击“取消进行中的请求”，会显示 AbortError。这里调用实例 cancelAll()；也可保存 HttpTask 后调用 task.cancel() 或 api.cancel(task.requestId)。' } } },
};

export const Errors: Story = {
  name: 'HTTP 错误与错误拦截器',
  parameters: { controls: { disable: true }, docs: { description: { story: '模拟 502 响应。错误拦截器记录请求 ID 并返回原错误，调用方通过 HttpError 读取响应状态与错误体。返回错误不会将请求恢复为成功。' } } },
  render: () => <Demo run={async track => {
    const events: string[] = [];
    const api = track(createHttpClient({ baseURL: 'https://example.com/api/', fetch: transport(80, 502) }));
    api.interceptors.error.use((error, context) => {
      events.push(`错误拦截器：${context.requestId}`);
      return error;
    });
    try {
      await api.get('unavailable');
    } catch (error) {
      if (error instanceof HttpError) return { events, name: error.name, status: error.response.status, data: error.response.data, requestId: error.requestId };
      if (error instanceof HttpTimeoutError) return { name: error.name, timeout: error.timeout };
      throw error;
    }
  }} />,
};

export const CustomFetch: Story = {
  name: '自定义 Fetch 与独立实例',
  parameters: { controls: { disable: true }, docs: { description: { story: '两个实例共享一个模拟传输函数，各自启用缓存。实例 A 的第二次请求命中缓存，实例 B 首次仍发送请求，说明缓存按实例隔离。Node、SSR 使用绝对 baseURL，按用户或服务端请求创建实例。' } } },
  render: () => <Demo run={async track => {
    const fetch = transport();
    const options = { baseURL: 'https://example.com/api/', cache: true, fetch };
    const a = track(createHttpClient(options));
    const b = track(createHttpClient(options));
    const results = [await a.get('users'), await a.get('users'), await b.get('users')];
    return results.map(({ fromCache, data }) => ({ fromCache, data }));
  }} />,
};
