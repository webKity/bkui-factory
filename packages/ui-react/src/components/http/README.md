`http` 是基于 Fetch 的请求工具，提供类型化响应、查询参数、JSON 请求体、拦截器、超时、取消与实例内存缓存。通过 `@bkreact/ui/http` 独立入口使用，无需引入 UI 组件或样式。

## 快速开始

```ts
import { createHttpClient } from '@bkreact/ui/http';

const api = createHttpClient({
  baseURL: 'https://example.com/api/',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
});

interface User {
  id: number;
  name: string;
}

const task = api.get<User>('users/1');
console.log(task.requestId); // 创建任务时即可取得请求 ID

const response = await task;
console.log(response.data.name);
console.log(response.status, response.fromCache);
```

后续示例沿用此处的 `api` 和 `User`。域名及路径是占位示例，接入时需替换为实际业务接口。泛型 `User` 描述解析后的 `data` 类型，不会在运行时校验服务端数据。

## 创建实例与默认配置

`createHttpClient(options)` 返回 `HttpClient`，也可以使用 `new HttpClient(options)`。每个实例拥有独立的默认配置、拦截器、缓存和进行中的请求。

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `baseURL` | 未设置 | URL 解析基址；浏览器中未设置时使用当前页面地址 |
| `headers` | 空请求头 | 默认请求头；单次请求按名称覆盖，大小写不敏感 |
| `timeout` | `0` | 超时毫秒数，`0` 表示不设超时 |
| `responseType` | `'auto'` | 响应体解析方式 |
| `cache` | `false` | 实例内存缓存，可传 `true` 或 `{ ttl }` |
| `cacheKey` | 未设置 | 自定义完整缓存键；接收请求拦截器处理后、URL 已解析且包含查询参数的配置 |
| `maxCacheEntries` | `100` | 实例缓存容量，必须为非负整数；`0` 关闭实例内存缓存 |
| `fetch` | `globalThis.fetch` | 自定义传输函数，仅在创建实例时设置 |
| `fetchCache` | 未设置 | 传给 Fetch 的原生 `cache` 选项，与实例内存缓存独立 |
| `credentials` 等 | 交给 Fetch | 支持其余 `RequestInit` 配置，例如 `mode`、`redirect`、`referrerPolicy` |

单次请求配置覆盖实例默认配置；只有 `headers` 按名称合并，其余配置直接覆盖。例如，单次传入 `cache: false` 可跳过实例默认启用的缓存。创建实例时会复制默认请求头，后续修改原始 headers 对象不会更新实例。

`url`、`method`、`params`、`body`、`json`、`signal` 在单次请求中设置；`fetch`、`maxCacheEntries` 是实例专属配置。`request({ url })` 未指定方法时使用 GET。

## 请求方法

| 方法 | 用法 |
| --- | --- |
| `get<T>` | `api.get<T>(url, config?)` |
| `head<T>` | `api.head<T>(url, config?)`，响应 `data` 为 `undefined` |
| `post<T>` | `api.post<T>(url, config?)` |
| `put<T>` | `api.put<T>(url, config?)` |
| `patch<T>` | `api.patch<T>(url, config?)` |
| `delete<T>` | `api.delete<T>(url, config?)` |
| `request<T>` | `api.request<T>({ url, method, ...config })`，支持自定义 HTTP 方法 |

`post`、`put`、`patch` 的第二个参数是配置对象，请求数据通过其中的 `json` 或 `body` 传入。所有方法返回 `HttpTask<T>`。

```ts
const created = await api.post<User>('users', {
  json: { name: '小明' },
});

await api.patch<User>(`users/${created.data.id}`, {
  json: { name: '小红' },
});

await api.delete(`users/${created.data.id}`);

await api.request({ url: 'users/1', method: 'OPTIONS' });
```

### URL 与查询参数

URL 遵循 `new URL(url, baseURL)` 的解析规则。基址末尾的 `/` 和请求路径开头的 `/` 会影响结果。

| `baseURL` | 请求路径 | 最终地址 |
| --- | --- | --- |
| `https://example.com/api/` | `users` | `https://example.com/api/users` |
| `https://example.com/api/` | `/users` | `https://example.com/users` |
| `https://example.com/api` | `users` | `https://example.com/users` |
| 任意基址 | `https://other.example.com/users` | 使用该绝对地址 |

浏览器支持相对于当前页面的 URL 和 `baseURL`。Node 等没有 `location` 的环境需提供绝对 URL 或绝对 `baseURL`。发送前会移除 URL 的 `#hash`。

```ts
await api.get('users?sort=name&page=1', {
  params: {
    page: 2,
    tags: ['active', 'verified'],
    enabled: false,
    keyword: '中文 搜索',
    omitted: null,
  },
});
// 查询参数包含：sort=name&page=2&tags=active&tags=verified&enabled=false
// keyword 自动进行 URL 编码；omitted 不添加到 URL。
```

`params` 支持字符串、数字、布尔值及它们的数组。数组编码为重复参数名；`null`、`undefined` 被忽略，不会删除 URL 中已有的同名参数。其他值先删除 URL 中的同名参数再追加；空数组会删除同名参数。

### JSON、表单与原始请求体

`json` 自动执行 `JSON.stringify`，并在未指定 `Content-Type` 时设置 `application/json`。`json` 与非空 `body` 同时出现会拒绝请求并抛出 `TypeError`。

```ts
await api.post('users', {
  json: { name: '小明' },
  headers: { 'X-Source': 'console' },
});

const form = new FormData();
form.append('name', '小明');
form.append('avatar', new Blob(['image content'], { type: 'text/plain' }), 'avatar.txt');
await api.post('upload', { body: form });

await api.post('messages', {
  body: 'plain text',
  headers: { 'Content-Type': 'text/plain' },
});
```

上传 `FormData` 时让 Fetch 自动生成带 boundary 的 `Content-Type`，不要手动设置；如果实例默认设置了 JSON 请求头，可在请求拦截器中删除该头。`body` 接受 Fetch 原生支持的请求体，包括 `FormData`、`URLSearchParams`、`Blob` 和字符串。

## 响应结构与解析方式

`await task` 返回 `HttpResponse<T>`，业务数据位于 `response.data`。

| 字段 | 说明 |
| --- | --- |
| `data` | 按 `responseType` 解析的响应体 |
| `requestId` | 当前调用的唯一标识，与 `task.requestId` 一致 |
| `config` | 请求拦截器处理后的配置 |
| `status` / `statusText` | HTTP 状态码与状态描述 |
| `headers` | `Headers` 对象，通过 `.get(name)` 读取 |
| `url` | 响应 URL；传输层未提供时使用实际请求地址 |
| `fromCache` | 是否命中该实例的内存缓存；不代表浏览器 HTTP 缓存命中情况 |

| `responseType` | 解析规则 |
| --- | --- |
| `'auto'` | 默认值；`Content-Type` 匹配 JSON 时解析 JSON，否则返回文本 |
| `'json'` | 强制按 JSON 解析，无需服务端设置 JSON 内容类型 |
| `'text'` | 返回字符串 |
| `'blob'` | 返回 `Blob` |
| `'arrayBuffer'` | 返回 `ArrayBuffer` |

HEAD、204、205 响应始终返回 `data: undefined`。JSON 模式下空响应体也返回 `undefined`；文本模式下空响应体为 `''`。成功响应包含非法 JSON 时抛出 `SyntaxError`；非 2xx 响应包含非法 JSON 时保留原始文本，并通过 `HttpError.response.data` 提供。

```ts
const text = await api.get<string>('health', { responseType: 'text' });
const file = await api.get<Blob>('exports/report', { responseType: 'blob' });
const bytes = await api.get<ArrayBuffer>('exports/raw', { responseType: 'arrayBuffer' });
console.log(text.data, file.data.size, bytes.data.byteLength);
```

## 拦截器

通过 `api.interceptors.request`、`response`、`error` 注册拦截器。三类拦截器都按注册顺序串行执行，支持同步或异步函数。

一次请求的执行顺序是：合并配置 → 请求拦截器 → 读取缓存或发送 Fetch → 解析响应体 → 响应拦截器。任一阶段失败时进入错误拦截器；非 2xx 响应直接进入错误拦截器。

### 请求拦截器：鉴权和公共请求头

接收配置与 `{ requestId, signal }`，必须返回包含字符串 `url` 的完整配置，否则抛出 `TypeError`。`config.signal` 在类型上只读，拦截器不应修改；客户端仅在调用请求方法时绑定原始外部信号，拦截器应使用 `context.signal` 处理取消。示例从应用维护的变量读取当前令牌：

```ts
let accessToken: string | undefined;

const authId = api.interceptors.request.use((config, context) => {
  const headers = new Headers(config.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('X-Request-ID', context.requestId);
  if (config.body instanceof FormData) headers.delete('Content-Type');
  return { ...config, headers };
});

// 登录成功后，由应用更新令牌；后续请求会读取新值。
accessToken = 'your-access-token';

// 移除这一条，或清空某一类拦截器：
api.interceptors.request.eject(authId);
api.interceptors.request.clear();
```

`requestId` 默认只在客户端维护；需要发送给服务端时，可按上例写入请求头。跨域请求需要服务端允许对应请求头。为每次请求写入不同的请求头会影响缓存命中，详见缓存说明。

### 响应拦截器：转换业务数据

接收已经解析的 `HttpResponse`，必须返回完整响应，包含带字符串 `url` 的 `config`；返回 `undefined` 或缺少必要字段时抛出 `TypeError` 并进入错误拦截器，下一个响应拦截器不会执行。可在应用封装层统一处理业务响应结构：

```ts
const businessApi = createHttpClient({ baseURL: 'https://example.com/api/' });

businessApi.interceptors.response.use(response => {
  const body = response.data as { code: number; message: string; data: unknown };
  if (body.code !== 0) throw new Error(body.message);
  return { ...response, data: body.data };
});

// 此泛型对应转换后的 data。
const user = await businessApi.get<User>('users/1');
console.log(user.data.name);
```

此例要求接口统一返回 `{ code, message, data }`。响应拦截器不会自动识别业务协议；请按实际服务端结构实现。最终响应的 `requestId` 和 `config` 由客户端维护，响应拦截器不能替换这两个关联字段。

### 错误拦截器与管理规则

错误拦截器接收错误和请求上下文。返回值会作为新的错误继续拒绝，也可以直接 `throw`；返回普通数据不会让请求恢复成功，因此调用方收到的拒绝值可能不是 `Error`。仅记录日志时应返回原错误：

```ts
const logId = api.interceptors.error.use((error, context) => {
  console.error('请求失败', context.requestId, error);
  return error;
});

api.interceptors.error.eject(logId);
```

每次调用请求方法时会为三类拦截器各取一份快照。请求开始后再注册、移除或清空拦截器，只影响后续请求。缓存命中仍会执行请求和响应拦截器；内存缓存保存原始响应，响应拦截器的转换会在每次调用时重新执行。

## 超时与取消

`timeout` 必须是有限的非负数，单位为毫秒。计时覆盖请求拦截器、Fetch、响应体解析和响应拦截器；错误拦截器在失败清理后执行，其执行时间不受该计时器限制。

超时会中止内部 `AbortSignal` 并抛出 `HttpTimeoutError`，包含 `requestId`、`timeout`，其 `name` 为 `'TimeoutError'`。需要调整单次超时值时直接传请求配置；请求拦截器中修改 `timeout` 不会重设计时器。

```ts
await api.get('slow-report', { timeout: 30_000 });
await api.get('long-running-job', { timeout: 0 });
```

### 取消单个请求

任务对象是带 `requestId` 和 `cancel(reason?)` 的 Promise。应在 `await` 前保存任务引用；`await` 后得到的是响应对象。

```ts
const task = api.get<User>('users/1');
const result = task.catch(error => {
  if (error instanceof Error && error.name === 'AbortError') return;
  throw error;
});

task.cancel();
await result;
```

也可使用 `api.cancel(task.requestId, reason?)`，成功中止尚未取消的任务时返回 `true`；已经中止、请求结束或 ID 不存在时返回 `false`。同一事件循环中重复调用，或 `task.cancel()`、`cancelAll()`、外部信号中止后立即调用，也返回 `false`。同一 URL 的并发请求拥有不同 ID，取消一个不会取消另一个；客户端不会自动合并相同 URL 的并发请求。

### 外部信号与批量取消

```ts
const controller = new AbortController();
const task = api.get('users', { signal: controller.signal });
const result = task.catch(error => {
  if (error instanceof Error && error.name === 'AbortError') return;
  throw error;
});
controller.abort();
await result;

// 取消该实例当前进行中的所有请求，不影响以后发起的请求。
api.cancelAll();
```

调用时已经中止的外部信号会直接拒绝请求。未传自定义原因时，取消通常以 `AbortError` 拒绝；传入 `reason` 时，拒绝值就是该原因，可能不是 `Error`。错误拦截器仍可转换最终错误。

取消会通知传输层，但无法撤销服务端已经完成的操作。异步拦截器应使用上下文 `signal` 配合自己的异步工作；取消不能自动停止任意 JavaScript Promise。

在响应拦截器阶段取消或超时，不会移除本次命中的有效缓存，也不会写入本次新获取的响应。业务校验失败仍会使本次命中的缓存失效。

## 实例内存缓存

### 开启、覆盖与清空

```ts
const cachedApi = createHttpClient({
  baseURL: 'https://example.com/api/',
  cache: { ttl: 30_000 },
  maxCacheEntries: 100,
});

const first = await cachedApi.get<User>('users/1');
const second = await cachedApi.get<User>('users/1');
console.log(first.fromCache, second.fromCache); // 首次 false，有效期内再次调用 true

await cachedApi.get('users/1', { cache: false }); // 跳过内存缓存读写
await cachedApi.get('users/2', { cache: { ttl: 5_000 } });
cachedApi.clearCache();
```

`cache: true` 或 `cache: {}` 使用 30 秒 TTL；`ttl: 0` 不缓存。JavaScript 调用方传入 `cache: null` 时按关闭缓存处理。TTL 必须是有限的非负数。仅缓存无请求体的 GET、HEAD 成功响应；POST、错误响应、解析失败、响应拦截器失败，以及在响应处理完成前取消或超时的请求不会写入缓存。

TTL 从响应拦截器全部成功后的缓存写入时计算，命中不会延长有效期。单次配置的 TTL 用于新写入条目，不会改变已存在条目的过期时间。达到容量后淘汰最久未使用的条目；缓存响应会克隆并重新解析，修改上一次响应的 `data` 或 `headers` 不影响后续结果。

缓存保存原始 HTTP 响应，但只在响应拦截器全部通过后写入。业务校验拦截器报错时不会缓存；若本次命中了已有缓存，则移除本次命中的条目，不删除并发请求后来写入的新条目。若内部信号已经中止（取消或超时），则保留本次命中的缓存。修改数据的请求不会自动清理关联 GET 缓存，需要调用 `clearCache()` 或自行安排失效。

过期条目会在请求和写入缓存时清理；空闲期间不会自动启动定时器。需要主动释放过期响应时可调用 `cachedApi.prune()`，返回本次删除的条数；`clearCache()` 则删除全部条目。

### 缓存隔离与身份切换

缓存键包含最终 URL（含查询参数）、HTTP 方法、全部请求头，以及 `credentials`、`mode`、`redirect`、`integrity`、`referrer`、`referrerPolicy`、`fetchCache`。不同实例不共享缓存。

默认键中 Authorization 不同会隔离缓存；请求拦截器若每次加入不同的 `X-Request-ID` 或时间戳请求头，也会导致无法命中。可使用 `cacheKey` 排除已确认不影响响应内容的头，同时保留其他隔离维度。例如下例保留 URL、方法、其余请求头和 Fetch 策略，只忽略 `X-Request-ID`：

```ts
const tracedApi = createHttpClient({
  baseURL: 'https://example.com/api/',
  cache: true,
  cacheKey: config => {
    const headers: [string, string][] = [];
    new Headers(config.headers).forEach((value, name) => {
      if (name !== 'x-request-id') headers.push([name, value]);
    });
    return JSON.stringify([
      config.url, config.method, headers.sort(), config.credentials ?? 'same-origin',
      config.mode, config.redirect, config.integrity, config.referrer,
      config.referrerPolicy, config.fetchCache,
    ]);
  },
});
```

`cacheKey` 可在实例或单次请求中设置，仅对启用缓存的 GET/HEAD 请求调用，必须同步返回字符串；否则请求以 `TypeError` 拒绝。回调中的 `url` 已解析为最终地址，包含 `params`，`method` 已转大写，`headers` 是合并并经请求拦截器处理后的 `Headers`。自定义返回值完整替换默认缓存键，业务需自行保留鉴权、语言、租户等会影响响应的差异；不同回调产生相同字符串时共享同一实例的缓存条目。

回调中的 `config.signal` 属于请求配置，不是客户端内部传给 Fetch 的取消信号，不应参与缓存键计算；拦截器需要观察实际取消状态时使用 `context.signal`。

Cookie 等浏览器隐式身份信息不在缓存键中。登录、退出、切换账号后应调用 `clearCache()`；该方法也会阻止清空前已经进入传输阶段的请求随后回填旧缓存，但不会取消这些请求。需要同时停止旧请求时可先 `cancelAll()` 再 `clearCache()`。

### 与浏览器 HTTP 缓存的区别

`cache` 控制本工具的实例内存缓存，`fetchCache` 传给 Fetch 原生缓存策略，两者独立：

```ts
await api.get('users/1', {
  cache: false,
  fetchCache: 'no-store',
});
```

实例内存缓存按自身 TTL 工作，不根据响应 `Cache-Control` 自动调整。需要遵循服务端缓存策略时，可关闭实例内存缓存并交给 Fetch 处理。`fromCache` 仅标记本工具的内存缓存命中。

## 错误处理

非 2xx 状态码会拒绝 Promise，不能仅在成功分支检查状态码。网络错误、解析错误和配置错误也会进入错误拦截器，再交给调用方的 `catch`。

```ts
import { HttpError, HttpTimeoutError } from '@bkreact/ui/http';

try {
  const response = await api.get<User>('users/1');
  console.log(response.data);
} catch (error) {
  if (error instanceof HttpError) {
    console.error('HTTP 错误', error.response.status, error.response.data, error.requestId);
  } else if (error instanceof HttpTimeoutError) {
    console.error('超时', error.timeout, error.requestId);
  } else if (error instanceof Error && error.name === 'AbortError') {
    console.log('请求已取消');
  } else {
    // 包括网络错误、JSON 解析错误、自定义取消原因及拦截器抛出的错误。
    throw error;
  }
}
```

| 错误 | 触发条件与可用信息 |
| --- | --- |
| `HttpError` | 非 2xx；通过 `response` 读取状态、响应头、已解析的错误体与请求 ID |
| `HttpTimeoutError` | 超过配置时间；含 `requestId` 与 `timeout` |
| `AbortError` 或自定义原因 | 手动取消或外部信号中止 |
| `SyntaxError` | 成功响应无法按 JSON 解析 |
| `RangeError` | 非法的超时、TTL 或缓存容量；容量错误在创建实例时同步抛出 |
| `TypeError` 等 | URL 无法解析、`json` 与 `body` 冲突、Fetch 网络失败等 |

客户端没有内置重试、令牌刷新、业务错误码判断或上传/下载进度回调。重试和刷新需由业务封装，并考虑请求是否可以安全重复提交。

## Node、SSR 与自定义传输

运行环境需要提供 Fetch 相关标准 API，例如 `Headers`、`AbortController`；读取二进制或上传表单时还需对应的 `Blob`、`FormData`。提供自定义 `fetch` 不会自动补齐这些全局 API。

自定义传输函数接收最终 URL 和 Fetch 配置，返回标准 `Response`，适合测试或接入平台适配器：

```ts
const mockApi = createHttpClient({
  baseURL: 'https://example.com/api/',
  fetch: async (url, init) => {
    console.log(url, init?.method);
    return Response.json({ id: 1, name: '测试用户' });
  },
});

const response = await mockApi.get<User>('users/1');
console.log(response.data.name); // 测试用户
```

SSR 中应为每个用户或服务端请求创建独立实例，避免共享鉴权信息、缓存和批量取消状态。Node 端必须使用绝对 URL 或绝对基址；浏览器端跨域、Cookie 和凭证发送仍遵循 Fetch 与服务端的 CORS 配置。

## API 与类型索引

独立入口同时导出 `createHttpClient`、`HttpClient`、`HttpError`、`HttpTimeoutError` 和 `HttpInterceptorManager`。

| 类型 | 用途 |
| --- | --- |
| `HttpClientOptions` | 创建实例的默认配置与传输函数 |
| `HttpRequestConfig` | 单次请求完整配置，`request` 必须传 `url` |
| `HttpResponse<T>` | 解析后的响应与元数据 |
| `HttpTask<T>` | 带请求 ID 和取消方法的 Promise |
| `HttpRequestContext` | 拦截器上下文：`requestId`、`signal` |
| `HttpResponseType` | 支持的五种响应解析模式 |
| `HttpCacheOptions` | 内存缓存 TTL 配置 |
| `HttpRequestInterceptor` | 请求配置转换函数 |
| `HttpResponseInterceptor` | 响应转换函数 |
| `HttpErrorInterceptor` | 错误转换函数 |

实现依据：`packages/ui-react/src/components/http/index.ts` 与 `type.ts`；行为验证见同目录 `http.test.mjs`。
