import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const project = fileURLToPath(new URL('../../../', import.meta.url));
let temporary, Toast, showToast, dom, root, container, createRoot;
before(async () => {
  temporary = await mkdtemp(path.join(project, '.toast-test-'));
  const result = await build({
    stdin: { contents: "export * from './src/components/toast';", resolveDir: project },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'toast.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Toast, showToast } = await import(file));
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove();
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });
async function render(props) {
  if (!root) {
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(h(StrictMode, null, h(Toast, { msg: '提示', ...props }))));
}
const card = () => document.querySelector('.bkreact-toast');
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test('SSR is safe; portal carries intent semantics, class, icons, message and ref', async () => {
  assert.equal(renderToStaticMarkup(h(Toast, { msg: 'SSR' })), '');
  const ref = { current: null };
  for (const intent of ['normal', 'brand', 'success', 'warning', 'danger']) {
    await render({ intent, duration: 0, className: 'custom', ref });
    assert.equal(card().dataset.intent, intent);
    assert.equal(card().getAttribute('role'), intent === 'danger' ? 'alert' : 'status');
    assert.equal(card().getAttribute('aria-atomic'), 'true');
    assert(card().querySelector('.bkreact-toast__icon svg'));
    assert(card().classList.contains('custom'));
    assert.equal(ref.current, card());
    assert.equal(container.querySelector('.bkreact-toast'), null);
  }
  await render({ duration: 0, icon: h('b', null, 'icon') });
  assert.equal(card().querySelector('.bkreact-toast__icon').textContent, 'icon');
  await render({ duration: 0, icon: null });
  assert.equal(card().querySelector('.bkreact-toast__icon'), null);
});

test('automatic close fires once, uses latest callback and reopens on visible toggle', async () => {
  let closes = 0;
  await render({ duration: 80, onClose: () => assert.fail('stale callback') });
  await render({ duration: 80, onClose: () => closes++ });
  await wait(110);
  assert.equal(card(), null);
  assert.equal(closes, 1);
  await render({ visible: false, duration: 80 });
  await render({ visible: true, duration: 80, onClose: () => closes++ });
  assert(card());
  await wait(110);
  assert.equal(closes, 2);
});

test('hiding and unmounting cancel timers without onClose', async () => {
  let closes = 0;
  await render({ duration: 30, onClose: () => closes++ });
  await render({ visible: false, duration: 30, onClose: () => closes++ });
  await wait(60);
  assert.equal(card(), null);
  assert.equal(closes, 0);
  await render({ duration: 30, onClose: () => closes++ });
  await act(() => root.unmount()); root = undefined;
  await wait(60);
  assert.equal(closes, 0);
  assert.equal(document.querySelector('.bkreact-toast-viewport'), null);
});

test('persistent durations and new messages restart a dismissed toast', async () => {
  for (const duration of [0, -1, Infinity, NaN]) {
    await render({ duration });
    await wait(10);
    assert(card());
  }
  await render({ duration: 20 });
  await wait(40);
  assert.equal(card(), null);
  await render({ msg: '新的消息', duration: 0 });
  assert.equal(card().querySelector('.bkreact-toast__message').textContent, '新的消息');
});

test('showToast automatically cleans up its root and calls onClose once', async () => {
  let closes = 0, close;
  await act(async () => { close = showToast({ msg: '函数提示', duration: 20, onClose: () => closes++ }); });
  assert.equal(card().textContent, '函数提示');
  await wait(50);
  assert.equal(card(), null);
  assert.equal(document.querySelector('.bkreact-toast-root'), null);
  assert.equal(closes, 1);
  await act(async () => { close(); close(); });
  assert.equal(closes, 1);
});

test('showToast replaces the previous toast and supports idempotent manual close', async () => {
  let first = 0, second = 0, closeFirst, closeSecond;
  await act(async () => { closeFirst = showToast({ msg: '第一条', duration: 0, onClose: () => first++ }); });
  await act(async () => { closeSecond = showToast({ msg: '第二条', duration: 0, intent: 'warning', icon: null, className: 'function-toast', onClose: () => second++ }); });
  assert.equal(document.querySelectorAll('.bkreact-toast').length, 1);
  assert.equal(card().textContent, '第二条');
  assert.equal(card().dataset.intent, 'warning');
  assert(card().classList.contains('function-toast'));
  assert.equal(card().querySelector('.bkreact-toast__icon'), null);
  assert.equal(first, 1);
  await act(async () => closeFirst());
  assert(card());
  await act(async () => { closeSecond(); closeSecond(); });
  assert.equal(second, 1);
  assert.equal(card(), null);
  assert.equal(document.querySelector('.bkreact-toast-root'), null);
});

test('showToast can close before the initial render and is a no-op on the server', async () => {
  let closes = 0;
  await act(async () => {
    const close = showToast({ msg: '立即关闭', onClose: () => closes++ });
    close();
  });
  assert.equal(closes, 1);
  assert.equal(card(), null);
  assert.equal(document.querySelector('.bkreact-toast-root'), null);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    delete globalThis.document;
    assert.doesNotThrow(() => showToast({ msg: 'SSR' })());
  } finally { Object.defineProperty(globalThis, 'document', descriptor); }
});
