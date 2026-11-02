import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

let directory, createHttpClient, HttpError, HttpTimeoutError;
const entry = new URL('./index.ts', import.meta.url).pathname;
const json = (data, init) => Response.json(data, init);
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'bk-http-'));
  const outfile = join(directory, 'http.mjs');
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm' });
  ({ createHttpClient, HttpError, HttpTimeoutError } = await import(pathToFileURL(outfile).href));
});

after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

test('Node: serializes params/JSON and merges headers without mutating options', async () => {
  let received;
  const options = { baseURL: 'https://api.example.com/v1/', headers: { authorization: 'Bearer a', 'x-default': 'a' }, fetch: async (url, init) => {
    received = { url, init };
    return json({ saved: true });
  } };
  const client = createHttpClient(options);
  options.headers.authorization = 'mutated';
  const result = await client.post('users?keep=yes#hash', {
    json: { name: '测试' }, headers: { 'x-default': 'b' },
    params: { tags: ['a', 'b'], page: 2, enabled: false, absent: null },
  });
  assert.equal(received.url, 'https://api.example.com/v1/users?keep=yes&tags=a&tags=b&page=2&enabled=false');
  assert.equal(received.init.method, 'POST');
  assert.equal(received.init.headers.get('authorization'), 'Bearer a');
  assert.equal(received.init.headers.get('x-default'), 'b');
  assert.equal(received.init.headers.get('content-type'), 'application/json');
  assert.equal(received.init.body, JSON.stringify({ name: '测试' }));
  assert.deepEqual(result.data, { saved: true });
});

test('browser bundle resolves relative URLs using the current page', async () => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'browser', format: 'iife', globalName: 'BKHttp', write: false });
  const dom = new JSDOM('', { url: 'https://app.example.com/page', runScripts: 'outside-only' });
  try {
    Object.assign(dom.window, { Headers, AbortController, Response });
    dom.window.eval(`${bundle.outputFiles[0].text}\nwindow.BKHttp = BKHttp;`);
    const client = dom.window.BKHttp.createHttpClient({ fetch: async url => json({ url }) });
    assert.equal((await client.get('/users')).data.url, 'https://app.example.com/users');
  } finally { dom.window.close(); }
});

test('concurrent calls to the same URL resolve independently in reverse order', async () => {
  const calls = [];
  const client = createHttpClient({ fetch: () => {
    const call = deferred(); calls.push(call); return call.promise;
  } });
  const first = client.get('https://example.com');
  const second = client.get('https://example.com');
  assert.notEqual(first.requestId, second.requestId);
  calls[1].resolve(json({ order: 2 }));
  assert.equal((await second).data.order, 2);
  calls[0].resolve(json({ order: 1 }));
  const result = await first;
  assert.equal(result.data.order, 1);
  assert.equal(result.requestId, first.requestId);
});

test('uses native Node fetch without a custom transport', async () => {
  const response = await createHttpClient().get('data:application/json,%7B%22ok%22%3Atrue%7D');
  assert.deepEqual(response.data, { ok: true });
});

test('cache opt-in, TTL expiry, clear, and independent response bodies', async () => {
  let count = 0;
  const client = createHttpClient({ cache: { ttl: 1000 }, fetch: async () => json({ count: ++count }) });
  const url = 'https://example.com';
  const first = await client.get(url);
  first.data.count = 99;
  first.headers.set('x-custom', 'mutated');
  const second = await client.get(url);
  assert.equal(second.data.count, 1);
  assert.equal(second.fromCache, true);
  assert.equal(second.headers.get('x-custom'), null);
  assert.notEqual(first.requestId, second.requestId);
  const originalNow = Date.now;
  const time = originalNow();
  try {
    Date.now = () => time + 2000;
    assert.equal((await client.get(url)).data.count, 2);
  } finally { Date.now = originalNow; }
  client.clearCache();
  assert.equal((await client.get(url)).data.count, 3);
  await client.get(url, { cache: false });
  assert.equal(count, 4);
});

test('cache isolates authorization, credentials, params, and client instances', async () => {
  let count = 0;
  const options = { cache: true, fetch: async () => json(++count) };
  const client = createHttpClient(options);
  const url = 'https://example.com';
  await client.get(url, { headers: { authorization: 'a' } });
  await client.get(url, { headers: { authorization: 'b' } });
  await client.get(url, { credentials: 'omit' });
  await client.get(url, { params: { a: 1 } });
  await createHttpClient(options).get(url);
  assert.equal(count, 5);
  assert.equal((await client.get(url, { headers: { authorization: 'a' } })).data, 1);
});

test('bounded cache evicts least recently used entries; POST and errors are never cached', async () => {
  let count = 0;
  const client = createHttpClient({ cache: true, maxCacheEntries: 2, fetch: async url => json(++count, { status: url.endsWith('/error') ? 500 : 200 }) });
  const url = path => `https://example.com/${path}`;
  await client.get(url('a'));
  await client.get(url('b'));
  await client.get(url('a'));
  await client.get(url('c'));
  assert.equal((await client.get(url('b'))).fromCache, false);
  await client.post(url('post'));
  await client.post(url('post'));
  await assert.rejects(client.get(url('error')), HttpError);
  await assert.rejects(client.get(url('error')), HttpError);
  assert.equal(count, 8);
});

test('task.cancel and cancel(requestId) abort only the selected request', async () => {
  const signals = [];
  const client = createHttpClient({ fetch: (_url, init) => { signals.push(init.signal); return new Promise(() => {}); } });
  const first = client.get('https://example.com');
  const second = client.get('https://example.com');
  const rejected = assert.rejects(first, { name: 'AbortError' });
  first.cancel();
  await rejected;
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  const otherRejected = assert.rejects(second, { name: 'AbortError' });
  assert.equal(client.cancel(second.requestId), true);
  await otherRejected;
  assert.equal(client.cancel(second.requestId), false);
});

test('external signals, pre-aborted signals and cancelAll', async () => {
  let count = 0;
  const client = createHttpClient({ fetch: () => { count++; return new Promise(() => {}); } });
  const external = new AbortController();
  external.abort();
  await assert.rejects(client.get('https://example.com', { signal: external.signal }), { name: 'AbortError' });
  assert.equal(count, 0);
  const active = new AbortController();
  const first = client.get('https://example.com', { signal: active.signal });
  const firstRejected = assert.rejects(first, { name: 'AbortError' });
  active.abort();
  await firstRejected;
  const tasks = [client.get('https://example.com'), client.get('https://example.com')];
  const rejected = tasks.map(task => assert.rejects(task, { name: 'AbortError' }));
  client.cancelAll();
  await Promise.all(rejected);
});

test('timeout includes stalled async interceptors and releases pending requests', async () => {
  const client = createHttpClient({ timeout: 10, fetch: async () => json(1) });
  const hook = deferred();
  client.interceptors.request.use(async config => { await hook.promise; return config; });
  const task = client.get('https://example.com');
  await assert.rejects(task, error => error instanceof HttpTimeoutError && error.requestId === task.requestId);
  assert.equal(client.cancel(task.requestId), false);
  hook.resolve();
});

test('timeout aborts fetch and body parsing; canceled calls do not fill cache', async () => {
  let signal;
  const stalled = createHttpClient({ timeout: 10, fetch: (_url, init) => {
    signal = init.signal; return new Promise(() => {});
  } });
  await assert.rejects(stalled.get('https://example.com'), HttpTimeoutError);
  assert.equal(signal.aborted, true);
  let count = 0;
  let streamController;
  const client = createHttpClient({ cache: true, timeout: 10, fetch: async () => {
    if (++count > 1) return json({ ok: true });
    return new Response(new ReadableStream({ start(controller) { streamController = controller; } }));
  } });
  await assert.rejects(client.get('https://example.com'), HttpTimeoutError);
  streamController.enqueue(new TextEncoder().encode('late body'));
  streamController.close();
  assert.equal((await client.get('https://example.com')).fromCache, false);
});

test('async interceptors run in order, use snapshots and can be ejected', async () => {
  const events = [];
  const client = createHttpClient({ fetch: async (_url, init) => {
    events.push(init.headers.get('x-token')); return json({ value: 1 });
  } });
  const id = client.interceptors.request.use(async (config, context) => {
    events.push(context.requestId);
    config.headers.set('x-token', 'token');
    return config;
  });
  client.interceptors.response.use(async response => {
    events.push('response');
    return { ...response, data: { value: response.data.value + 1 }, requestId: 'wrong' };
  });
  const task = client.get('https://example.com');
  client.interceptors.request.eject(id);
  const result = await task;
  assert.deepEqual(events, [task.requestId, 'token', 'response']);
  assert.equal(result.data.value, 2);
  assert.equal(result.requestId, task.requestId);
  events.length = 0;
  await client.get('https://example.com');
  assert.deepEqual(events, [null, 'response']);
  client.interceptors.response.clear();
});

test('HTTP errors preserve status/body/requestId; error hooks can transform errors', async () => {
  const client = createHttpClient({ fetch: async () => new Response('upstream failed', {
    status: 502, headers: { 'content-type': 'application/json' },
  }) });
  const task = client.get('https://example.com');
  await assert.rejects(task, error => error instanceof HttpError && error.response.status === 502 && error.response.data === 'upstream failed' && error.requestId === task.requestId);
  client.interceptors.error.use((error, context) => new Error(`${context.requestId}:${error.response.status}`));
  await assert.rejects(client.get('https://example.com'), /:502/);
});

test('network and parsing failures reach error interceptors and are not cached', async () => {
  let count = 0;
  const client = createHttpClient({ cache: true, fetch: async () => {
    if (++count === 1) throw new TypeError('network failed');
    if (count === 2) return new Response('{invalid', { headers: { 'content-type': 'application/json' } });
    return json({ ok: true });
  } });
  const errors = [];
  client.interceptors.error.use(error => { errors.push(error); throw error; });
  await assert.rejects(client.get('https://example.com'), /network failed/);
  await assert.rejects(client.get('https://example.com'), SyntaxError);
  assert.equal((await client.get('https://example.com')).fromCache, false);
  assert.equal(errors.length, 2);
});

test('empty bodies, text and binary response modes', async () => {
  const client = createHttpClient({ fetch: async url => url.endsWith('/empty') ? new Response(null, { status: 204 }) : new Response('hello') });
  assert.equal((await client.get('https://example.com/empty')).data, undefined);
  assert.equal((await client.get('https://example.com')).data, 'hello');
  assert.equal((await client.get('https://example.com', { responseType: 'blob' })).data.size, 5);
  assert.equal((await client.get('https://example.com', { responseType: 'arrayBuffer' })).data.byteLength, 5);
});

test('rejects invalid options and conflicting bodies', async () => {
  assert.throws(() => createHttpClient({ maxCacheEntries: -1 }), RangeError);
  const client = createHttpClient({ fetch: async () => json(1) });
  await assert.rejects(client.get('https://example.com', { timeout: -1 }), RangeError);
  await assert.rejects(client.get('https://example.com', { cache: { ttl: NaN } }), RangeError);
  await assert.rejects(client.post('https://example.com', { body: 'x', json: {} }), /json and body/);
  await assert.rejects(client.get('/relative-in-node'), TypeError);
});

test('custom cacheKey ignores trace headers while keeping authorization and normalized URLs isolated', async () => {
  let count = 0;
  const client = createHttpClient({
    baseURL: 'https://example.com/api/', cache: true,
    cacheKey: config => {
      assert.equal(config.method, 'GET');
      const headers = new Headers(config.headers);
      return JSON.stringify([config.url, config.method, headers.get('authorization')]);
    },
    fetch: async (_url, init) => {
      assert.equal('cacheKey' in init, false);
      return json(++count);
    },
  });
  client.interceptors.request.use((config, context) => {
    const headers = new Headers(config.headers);
    headers.set('X-Request-ID', context.requestId);
    return { ...config, headers };
  });
  assert.equal((await client.get('users', { params: { page: 1 }, headers: { authorization: 'a' } })).data, 1);
  assert.equal((await client.get('users?page=1', { headers: { authorization: 'a' } })).fromCache, true);
  assert.equal((await client.get('users?page=1', { headers: { authorization: 'b' } })).data, 2);
  assert.equal((await client.get('users?page=2', { headers: { authorization: 'a' } })).data, 3);
  await assert.rejects(client.get('other', { cacheKey: () => undefined }), /cacheKey must return a string/);
});

test('business validation failure does not write HTTP 200 responses into cache', async () => {
  let count = 0;
  const client = createHttpClient({ cache: true, fetch: async () => json({ code: ++count === 1 ? 1 : 0, data: count }) });
  client.interceptors.response.use(response => {
    if (response.data.code !== 0) throw new Error('business failed');
    return { ...response, data: response.data.data };
  });
  await assert.rejects(client.get('https://example.com'), /business failed/);
  const valid = await client.get('https://example.com');
  assert.equal(valid.fromCache, false);
  assert.equal(valid.data, 2);
  const cached = await client.get('https://example.com');
  assert.equal(cached.fromCache, true);
  assert.equal(cached.data, 2); // 缓存的是原始业务结构，转换每次重新执行。
  assert.equal(count, 2);
});

test('cached response rejected by an interceptor is evicted', async () => {
  let count = 0;
  const client = createHttpClient({ cache: true, fetch: async () => json(++count) });
  await client.get('https://example.com');
  const id = client.interceptors.response.use(() => { throw new Error('invalid cache'); });
  await assert.rejects(client.get('https://example.com'), /invalid cache/);
  client.interceptors.response.eject(id);
  assert.equal((await client.get('https://example.com')).fromCache, false);
  assert.equal(count, 2);
});

test('clearCache during response interception prevents late cache writes', async () => {
  const reached = deferred();
  const release = deferred();
  const client = createHttpClient({ cache: true, fetch: async () => json(1) });
  const id = client.interceptors.response.use(async response => {
    reached.resolve(); await release.promise; return response;
  });
  const task = client.get('https://example.com');
  await reached.promise;
  client.clearCache();
  release.resolve();
  await task;
  client.interceptors.response.eject(id);
  assert.equal((await client.get('https://example.com')).fromCache, false);
});

test('cancellation during response interception does not populate cache', async () => {
  const reached = deferred();
  const release = deferred();
  const client = createHttpClient({ cache: true, fetch: async () => json(1) });
  const id = client.interceptors.response.use(async response => {
    reached.resolve(); await release.promise; return response;
  });
  const task = client.get('https://example.com');
  const rejected = assert.rejects(task, { name: 'AbortError' });
  await reached.promise;
  task.cancel();
  await rejected;
  release.resolve();
  client.interceptors.response.eject(id);
  assert.equal((await client.get('https://example.com')).fromCache, false);
});

for (const mode of ['cancel', 'timeout']) {
  test(`${mode} during response interception preserves an existing cache hit`, async () => {
    let count = 0;
    const client = createHttpClient({ cache: true, fetch: async () => json(++count) });
    await client.get('https://example.com');
    const reached = deferred();
    const release = deferred();
    const id = client.interceptors.response.use(async response => {
      assert.equal(response.fromCache, true);
      reached.resolve();
      await release.promise;
      return response;
    });
    const task = client.get('https://example.com', { timeout: mode === 'timeout' ? 20 : 0 });
    const rejected = assert.rejects(task, mode === 'timeout' ? HttpTimeoutError : { name: 'AbortError' });
    await reached.promise;
    if (mode === 'cancel') task.cancel();
    await rejected;
    release.resolve();
    // 等待已取消的拦截器退出，确保走过缓存失效的错误分支。
    await new Promise(resolve => setImmediate(resolve));
    client.interceptors.response.eject(id);
    const cached = await client.get('https://example.com');
    assert.equal(cached.fromCache, true);
    assert.equal(cached.data, 1);
    assert.equal(count, 1);
  });
}

test('invalid response config.url stops the chain before the next interceptor', async () => {
  for (const config of [{}, { url: 123 }]) {
    let reachedNext = false;
    const client = createHttpClient({ fetch: async () => json(1) });
    client.interceptors.response.use(response => ({ ...response, config }));
    client.interceptors.response.use(response => { reachedNext = true; return response; });
    await assert.rejects(client.get('https://example.com'), /Response interceptor must return/);
    assert.equal(reachedNext, false);
  }
});

test('cancel returns false immediately after cancellation through any entry point', async () => {
  const client = createHttpClient({ fetch: () => new Promise(() => {}) });
  const tasks = Array.from({ length: 4 }, () => client.get('https://example.com'));
  const rejections = tasks.map(task => assert.rejects(task, { name: 'AbortError' }));
  assert.equal(client.cancel(tasks[0].requestId), true);
  assert.equal(client.cancel(tasks[0].requestId), false);
  tasks[1].cancel();
  assert.equal(client.cancel(tasks[1].requestId), false);
  client.cancelAll();
  assert.equal(client.cancel(tasks[2].requestId), false);
  assert.equal(client.cancel(tasks[3].requestId), false);
  const controller = new AbortController();
  const external = client.get('https://example.com', { signal: controller.signal });
  const rejected = assert.rejects(external, { name: 'AbortError' });
  controller.abort();
  assert.equal(client.cancel(external.requestId), false);
  await Promise.all([...rejections, rejected]);
});

test('JavaScript cache:null disables instance cache without throwing', async () => {
  let count = 0;
  const client = createHttpClient({ cache: true, fetch: async () => json(++count) });
  await client.get('https://example.com', { cache: null });
  assert.equal((await client.get('https://example.com', { cache: null })).fromCache, false);
  assert.equal(count, 2);
});

test('prune releases only expired entries and reports the removed count', async () => {
  const client = createHttpClient({ fetch: async () => json(1) });
  await client.get('https://example.com/short', { cache: { ttl: 1000 } });
  await client.get('https://example.com/long', { cache: { ttl: 10_000 } });
  const now = Date.now;
  const time = now();
  try {
    Date.now = () => time + 2000;
    assert.equal(client.prune(), 1);
    assert.equal(client.prune(), 0);
    assert.equal((await client.get('https://example.com/long', { cache: true })).fromCache, true);
  } finally { Date.now = now; }
});

test('invalid interceptor return values fail explicitly and reach error hooks', async () => {
  let fetchCount = 0;
  const client = createHttpClient({ cache: true, fetch: async () => json(++fetchCount) });
  const errors = [];
  client.interceptors.error.use(error => { errors.push(error); return error; });
  for (const value of [undefined, null, {}, { url: 1 }]) {
    const id = client.interceptors.request.use(() => value);
    await assert.rejects(client.get('https://example.com'), /Request interceptor must return/);
    client.interceptors.request.eject(id);
  }
  assert.equal(fetchCount, 0);
  for (const value of [undefined, null, {}, { data: 1 }]) {
    const id = client.interceptors.response.use(() => value);
    await assert.rejects(client.get('https://example.com'), /Response interceptor must return/);
    client.interceptors.response.eject(id);
  }
  assert.equal(errors.length, 8);
  assert.equal((await client.get('https://example.com')).fromCache, false);
});

test('error hooks may reject with a non-Error value without recovering the request', async () => {
  const failure = { code: 'BUSINESS_ERROR' };
  const client = createHttpClient({ fetch: async () => { throw new Error('network'); } });
  client.interceptors.error.use(() => failure);
  await assert.rejects(client.get('https://example.com'), reason => reason === failure);
});

test('interceptor signal changes do not replace the managed transport signal', async () => {
  const external = new AbortController();
  let managedSignal;
  const client = createHttpClient({ fetch: (_url, init) => { managedSignal = init.signal; return new Promise(() => {}); } });
  client.interceptors.request.use(config => ({ ...config, signal: external.signal }));
  const task = client.get('https://example.com');
  const rejected = assert.rejects(task, { name: 'AbortError' });
  // 请求拦截器异步串行执行，等待传输层启动。
  await Promise.resolve();
  assert.notEqual(managedSignal, external.signal);
  task.cancel();
  assert.equal(managedSignal.aborted, true);
  assert.equal(external.signal.aborted, false);
  await rejected;
});
