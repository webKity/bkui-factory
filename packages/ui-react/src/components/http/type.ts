export type HttpResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer';

export interface HttpCacheOptions {
  /** 缓存有效期（毫秒），默认 30 秒；0 表示不缓存。 */
  ttl?: number;
}

export interface HttpRequestConfig extends Omit<RequestInit, 'cache' | 'signal'> {
  url: string;
  baseURL?: string;
  params?: Record<string, string | number | boolean | null | undefined | readonly (string | number | boolean)[]>;
  /** 自动 JSON.stringify 并设置 Content-Type；不能同时传 body。 */
  json?: unknown;
  responseType?: HttpResponseType;
  /** 默认关闭。仅缓存 GET/HEAD 的成功响应。 */
  cache?: boolean | HttpCacheOptions;
  /** 完整替换默认缓存键；url 已解析且包含 params。signal 属于调用配置，并非内部传输信号，不应参与键计算。需自行隔离鉴权等响应差异。 */
  cacheKey?: (config: Readonly<HttpRequestConfig>) => string;
  /** 仅在调用请求方法时读取；拦截器不应修改。内部取消信号使用 context.signal。 */
  readonly signal?: AbortSignal | null;
  /** fetch 原生的 HTTP 缓存策略。 */
  fetchCache?: RequestCache;
  /** 超时毫秒数，包括拦截器、网络和响应解析；0 表示无限制。 */
  timeout?: number;
}

export interface HttpClientOptions extends Omit<HttpRequestConfig, 'url' | 'method' | 'body' | 'json' | 'params' | 'signal'> {
  fetch?: typeof globalThis.fetch;
  /** 实例内最多缓存多少条响应，默认 100；0 表示关闭缓存。 */
  maxCacheEntries?: number;
}

export interface HttpRequestContext {
  readonly requestId: string;
  readonly signal: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  data: T;
  readonly requestId: string;
  readonly config: HttpRequestConfig;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly url: string;
  readonly fromCache: boolean;
}

export interface HttpTask<T> extends Promise<HttpResponse<T>> {
  readonly requestId: string;
  cancel(reason?: unknown): void;
}

export type HttpRequestInterceptor = (config: HttpRequestConfig, context: HttpRequestContext) => HttpRequestConfig | Promise<HttpRequestConfig>;
export type HttpResponseInterceptor = (response: HttpResponse, context: HttpRequestContext) => HttpResponse | Promise<HttpResponse>;
/** 返回值作为新的错误继续抛出；也可以直接 throw。 */
export type HttpErrorInterceptor = (error: unknown, context: HttpRequestContext) => unknown | Promise<unknown>;
