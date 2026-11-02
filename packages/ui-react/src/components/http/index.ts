import type {
  HttpClientOptions, HttpErrorInterceptor, HttpRequestConfig, HttpRequestContext,
  HttpRequestInterceptor, HttpResponse, HttpResponseInterceptor, HttpTask,
} from './type';

export type * from './type';

/** 按注册顺序执行；use 返回 ID，eject 移除，clear 清空。 */
export class HttpInterceptorManager<T> {
  private nextId = 0;
  private handlers = new Map<number, T>();

  use(handler: T): number {
    const id = this.nextId++;
    this.handlers.set(id, handler);
    return id;
  }

  eject(id: number): void { this.handlers.delete(id); }
  clear(): void { this.handlers.clear(); }
  /** 每次调用使用独立快照，注册/移除不会影响执行中的请求。 */
  snapshot(): T[] { return [...this.handlers.values()]; }
}

export class HttpError<T = unknown> extends Error {
  constructor(public readonly response: HttpResponse<T>) {
    super(`HTTP ${response.status} ${response.statusText}`.trim());
    this.name = 'HttpError';
  }

  get requestId(): string { return this.response.requestId; }
}

export class HttpTimeoutError extends Error {
  constructor(public readonly requestId: string, public readonly timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

interface CacheEntry { response: Response; expiresAt: number }
interface ExecutionResult {
  response: HttpResponse;
  commitCache(): void;
  invalidateCache(): void;
}
let clientSequence = 0;

function mergeHeaders(defaults?: HeadersInit, overrides?: HeadersInit): Headers {
  const headers = new Headers(defaults);
  new Headers(overrides).forEach((value, key) => headers.set(key, value));
  return headers;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Request aborted', 'AbortError');
}

function assertRequestConfig(value: unknown): asserts value is HttpRequestConfig {
  if (!value || typeof value !== 'object' || !('url' in value) || typeof value.url !== 'string') {
    throw new TypeError('Request interceptor must return a complete HttpRequestConfig with a string url');
  }
}

function assertResponse(value: unknown): asserts value is HttpResponse {
  const response = value as HttpResponse | null | undefined;
  if (!response || typeof response !== 'object' || !('data' in response)
    || typeof response.status !== 'number' || typeof response.statusText !== 'string'
    || typeof response.requestId !== 'string' || typeof response.url !== 'string'
    || typeof response.fromCache !== 'boolean' || typeof response.headers?.get !== 'function'
    || !response.config || typeof response.config !== 'object' || typeof response.config.url !== 'string') {
    throw new TypeError('Response interceptor must return a complete HttpResponse');
  }
}

export class HttpClient {
  readonly interceptors = {
    request: new HttpInterceptorManager<HttpRequestInterceptor>(),
    response: new HttpInterceptorManager<HttpResponseInterceptor>(),
    error: new HttpInterceptorManager<HttpErrorInterceptor>(),
  };

  private readonly defaults: HttpClientOptions;
  private readonly cacheEntries = new Map<string, CacheEntry>();
  private cacheGeneration = 0;
  private readonly pending = new Map<string, AbortController>();
  private readonly clientId = ++clientSequence;
  private sequence = 0;

  constructor(options: HttpClientOptions = {}) {
    if (options.maxCacheEntries !== undefined && (!Number.isInteger(options.maxCacheEntries) || options.maxCacheEntries < 0)) {
      throw new RangeError('maxCacheEntries must be a non-negative integer');
    }
    this.defaults = { ...options, headers: new Headers(options.headers) };
  }

  /** 清空此实例缓存；登录状态或服务端数据变化后可主动调用。 */
  clearCache(): void {
    this.cacheGeneration++;
    this.cacheEntries.clear();
  }

  /** 主动释放已过期的缓存，返回删除条数；也会在请求和缓存写入时自动执行。 */
  prune(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cacheEntries) {
      if (entry.expiresAt <= now) {
        this.cacheEntries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  cancel(requestId: string, reason?: unknown): boolean {
    const controller = this.pending.get(requestId);
    if (!controller || controller.signal.aborted) return false;
    controller.abort(reason);
    return true;
  }

  cancelAll(reason?: unknown): void {
    for (const controller of this.pending.values()) controller.abort(reason);
  }

  request<T = unknown>(config: HttpRequestConfig): HttpTask<T> {
    const requestId = `http-${this.clientId}-${++this.sequence}`;
    const controller = new AbortController();
    const context: HttpRequestContext = Object.freeze({ requestId, signal: controller.signal });
    const requestHooks = this.interceptors.request.snapshot();
    const responseHooks = this.interceptors.response.snapshot();
    const errorHooks = this.interceptors.error.snapshot();
    const { fetch: fetchImpl, maxCacheEntries, ...defaults } = this.defaults;
    const merged: HttpRequestConfig = {
      ...defaults, ...config, headers: mergeHeaders(defaults.headers, config.headers),
    };
    const externalSignal = config.signal;
    const onExternalAbort = () => controller.abort(externalSignal?.reason);
    this.pending.set(requestId, controller);
    if (externalSignal?.aborted) onExternalAbort();
    else externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: () => void = () => {};
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(abortReason(controller.signal));
      if (controller.signal.aborted) onAbort();
      else controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const run = async (): Promise<HttpResponse> => {
      const timeout = merged.timeout ?? 0;
      if (!Number.isFinite(timeout) || timeout < 0) throw new RangeError('timeout must be a non-negative finite number');
      if (timeout > 0) timer = setTimeout(() => controller.abort(new HttpTimeoutError(requestId, timeout)), timeout);
      controller.signal.throwIfAborted();
      let current = merged;
      for (const hook of requestHooks) {
        current = await hook(current, context);
        controller.signal.throwIfAborted();
        assertRequestConfig(current);
      }
      const execution = await this.execute(current, context, fetchImpl, maxCacheEntries ?? 100);
      let response = execution.response;
      try {
        for (const hook of responseHooks) {
          response = await hook(response, context);
          controller.signal.throwIfAborted();
          assertResponse(response);
        }
        controller.signal.throwIfAborted();
        execution.commitCache();
      } catch (error) {
        // 取消/超时只终止本次调用，不代表已命中的缓存内容无效。
        if (!controller.signal.aborted) execution.invalidateCache();
        throw error;
      }
      // 拦截器可转换 data，但请求与响应的关联始终由客户端维护。
      return { ...response, requestId, config: current };
    };
    const promise = Promise.race([aborted, run()])
      .finally(() => {
        if (timer !== undefined) clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onExternalAbort);
        controller.signal.removeEventListener('abort', onAbort);
        this.pending.delete(requestId);
      })
      .catch(async (error: unknown) => {
        for (const hook of errorHooks) {
          try { error = await hook(error, context); }
          catch (nextError) { error = nextError; }
        }
        throw error;
      }) as HttpTask<T>;
    Object.defineProperties(promise, {
      requestId: { value: requestId, enumerable: true },
      cancel: { value: (reason?: unknown) => controller.abort(reason) },
    });
    return promise;
  }

  get<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  head<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'HEAD' });
  }

  post<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'POST' });
  }

  put<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'PUT' });
  }

  patch<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'PATCH' });
  }

  delete<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}): HttpTask<T> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  private async execute(config: HttpRequestConfig, context: HttpRequestContext, fetchImpl: typeof globalThis.fetch | undefined, maxEntries: number): Promise<ExecutionResult> {
    const cacheGeneration = this.cacheGeneration;
    const {
      url, baseURL, params, json, responseType = 'auto', cache = false,
      cacheKey, fetchCache, timeout: _timeout, signal: _signal, ...init
    } = config;
    const browserBase = typeof location === 'undefined' ? undefined : location.href;
    const base = baseURL ? new URL(baseURL, browserBase).href : browserBase;
    const target = new URL(url, base);
    target.hash = '';
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === null || value === undefined) continue;
      target.searchParams.delete(key);
      for (const item of Array.isArray(value) ? value : [value]) target.searchParams.append(key, String(item));
    }
    const headers = new Headers(init.headers);
    if (json !== undefined) {
      if (init.body != null) throw new TypeError('json and body cannot be used together');
      init.body = JSON.stringify(json);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    const method = (init.method ?? 'GET').toUpperCase();
    const ttl = cache == null || cache === false ? 0 : typeof cache === 'object' ? cache.ttl ?? 30_000 : 30_000;
    if (!Number.isFinite(ttl) || ttl < 0) throw new RangeError('cache.ttl must be a non-negative finite number');
    const canCache = ttl > 0 && maxEntries > 0 && (method === 'GET' || method === 'HEAD') && init.body == null;
    // 请求头（含 Authorization）、credentials 和 fetch 策略均参与隔离。
    const headerEntries: [string, string][] = [];
    headers.forEach((value, name) => headerEntries.push([name, value]));
    let key = JSON.stringify(['default', target.href, method, headerEntries.sort(), init.credentials ?? 'same-origin', init.mode, init.redirect, init.integrity, init.referrer, init.referrerPolicy, fetchCache]);
    if (canCache && cacheKey) {
      const customKey = cacheKey({ ...config, url: target.href, method, headers });
      if (typeof customKey !== 'string') throw new TypeError('cacheKey must return a string');
      key = JSON.stringify(['custom', customKey]);
    }
    let response: Response | undefined;
    let fromCache = false;
    this.prune();
    const hit = canCache ? this.cacheEntries.get(key) : undefined;
    if (hit) {
      response = hit.response.clone();
      fromCache = true;
      this.cacheEntries.delete(key);
      this.cacheEntries.set(key, hit);
    }
    if (!response) {
      const transport = fetchImpl ?? globalThis.fetch;
      if (!transport) throw new Error('fetch is unavailable; provide HttpClientOptions.fetch');
      response = await transport(target.href, { ...init, method, headers, cache: fetchCache, signal: context.signal });
    }
    context.signal.throwIfAborted();
    const cacheCopy = canCache && !fromCache && response.ok ? response.clone() : undefined;
    let data: unknown;
    if (method === 'HEAD' || response.status === 204 || response.status === 205) data = undefined;
    else if (responseType === 'blob') data = await response.blob();
    else if (responseType === 'arrayBuffer') data = await response.arrayBuffer();
    else {
      const body = await response.text();
      const isJson = responseType === 'json' || (responseType === 'auto' && /\bjson\b/i.test(response.headers.get('content-type') ?? ''));
      // 非 2xx 响应即使不是合法 JSON，也保留原始错误体。
      if (isJson && body) {
        try { data = JSON.parse(body); }
        catch (error) { if (response.ok) throw error; data = body; }
      } else data = isJson ? undefined : body;
    }
    context.signal.throwIfAborted();
    const result: HttpResponse = {
      data, requestId: context.requestId, config, status: response.status,
      statusText: response.statusText, headers: new Headers(response.headers),
      url: response.url || target.href, fromCache,
    };
    if (!response.ok) throw new HttpError(result);
    return {
      response: result,
      commitCache: () => {
        if (cacheCopy && !context.signal.aborted && cacheGeneration === this.cacheGeneration) {
          // 网络和异步拦截器可能耗时很长，先释放期间过期的条目再执行容量淘汰。
          this.prune();
          this.cacheEntries.delete(key);
          this.cacheEntries.set(key, { response: cacheCopy, expiresAt: Date.now() + ttl });
          while (this.cacheEntries.size > maxEntries) this.cacheEntries.delete(this.cacheEntries.keys().next().value!);
        }
      },
      invalidateCache: () => {
        // 只移除本次命中的旧条目，避免删除并发请求刚写入的新响应。
        if (hit && this.cacheEntries.get(key) === hit) this.cacheEntries.delete(key);
      },
    };
  }
}

/**
 * 每个实例独立持有缓存和请求状态，SSR 应按用户/请求创建实例。
 * Node 需提供绝对 URL 或绝对 baseURL，并提供 fetch / Headers / AbortController 等标准 API。
 * URL 遵循 new URL 规则：baseURL 为 https://example.com/api/ 时，users 保留 /api/，/users 从根路径开始。
 * 缓存为实例内存缓存；Cookie 等隐式身份变化后应 clearCache()。
 *
 * @example
 * const api = createHttpClient({ baseURL: 'https://example.com/api/', timeout: 10_000 });
 * api.interceptors.request.use(config => {
 *   const headers = new Headers(config.headers);
 *   headers.set('Authorization', 'Bearer token');
 *   return { ...config, headers };
 * });
 * const task = api.get<{ name: string }>('user', { cache: { ttl: 30_000 } });
 * // task.cancel() 或 api.cancel(task.requestId) 可取消本次请求。
 * const { data, requestId, fromCache } = await task;
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  return new HttpClient(options);
}
