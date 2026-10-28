import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

const globalDescriptors = new Map();
function setGlobal(name, value) {
  globalDescriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

const project = fileURLToPath(new URL('../../../', import.meta.url));
let temporary, Alert, getAlertSizeStyle, dom, root, container, createRoot;
before(async () => {
  temporary = await mkdtemp(path.join(project, '.alert-test-'));
  const result = await build({
    stdin: { contents: "export {Alert} from './src/components/alert'; export {getAlertSizeStyle} from './src/components/alert/size';", resolveDir: project },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'alert.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Alert, getAlertSizeStyle } = await import(file));
  dom = new JSDOM('<!doctype html><html><head><style>.bkreact-alert[data-state="closing"] { animation-name: bk-alert-close; animation-duration: 10s; animation-delay: 0s; }</style></head><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
    setGlobal(name, dom.window[name]);
  }
  setGlobal('getComputedStyle', dom.window.getComputedStyle);
  setGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove(); container = undefined;
});
after(async () => {
  dom?.window.close();
  for (const [name, descriptor] of globalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

async function mount(props) {
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(Alert, props)));
}
function animationEnd(target, name = 'bk-alert-close') {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: name });
  target.dispatchEvent(event);
}

test('SSR renders message, optional slots and classes; close button defaults to hidden', () => {
  const markup = renderToStaticMarkup(h(Alert, { message: '提示', description: '说明', className: 'custom', contentClassName: 'content', prefixIcon: h('svg'), suffixIcon: h('svg'), action: h('button', null, '重试') }));
  const doc = new JSDOM(markup).window.document;
  const alert = doc.querySelector('[role="alert"]');
  assert.equal(alert.dataset.intent, 'normal');
  assert.equal(alert.dataset.size, 'base');
  assert(alert.classList.contains('custom'));
  assert.equal(alert.querySelector('.content .bkreact-alert__message').textContent, '提示');
  assert.equal(alert.querySelector('.bkreact-alert__description').textContent, '说明');
  assert.equal(alert.querySelectorAll('[aria-hidden="true"] svg').length, 2);
  assert.equal(alert.querySelector('.bkreact-alert__action button').textContent, '重试');
  assert.equal(alert.querySelector('.bkreact-alert__close'), null);
});

test('all sizes and sparse responsive scopes map to local design tokens', () => {
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    assert.equal(getAlertSizeStyle(size)['--alert-base-font-size'], `var(--alert-size-${size}-font-size)`);
    const doc = new JSDOM(renderToStaticMarkup(h(Alert, { message: '提示', size })));
    const alert = doc.window.document.querySelector('[role="alert"]');
    for (const breakpoint of ['sm', 'md', 'lg', 'xl', '2xl']) assert(!alert.hasAttribute(`data-size-${breakpoint}`));
    doc.window.close();
  }
  const props = { message: '提示', size: { base: 'xs', md: 'lg', '2xl': '2xl' } };
  const alert = new JSDOM(renderToStaticMarkup(h(Alert, props))).window.document.querySelector('[role="alert"]');
  assert.equal(alert.dataset.size, 'responsive');
  assert(alert.hasAttribute('data-size-md'));
  assert(!alert.hasAttribute('data-size-sm'));
  assert.equal(alert.style.getPropertyValue('--alert-md-icon-size'), 'var(--alert-size-lg-icon-size)');
  assert.throws(() => getAlertSizeStyle({ md: 'lg' }), /base/);
});

test('close waits for its own animation, ignores child events and invokes latest callback once', async () => {
  let first = 0, latest = 0;
  await mount({ message: '提示', closable: true, onClose: () => first++ });
  const alert = container.querySelector('[role="alert"]');
  await act(() => container.querySelector('button').click());
  assert.equal(alert.dataset.state, 'closing');
  assert.equal(first, 0);
  assert(container.querySelector('button').disabled);
  await act(() => root.render(h(Alert, { message: '提示', closable: true, onClose: () => latest++ })));
  await act(() => animationEnd(alert.querySelector('svg')));
  await act(() => animationEnd(alert, 'unrelated'));
  assert.equal(latest, 0);
  await act(() => animationEnd(alert));
  assert.equal(first, 0);
  assert.equal(latest, 1);
  assert.equal(container.innerHTML, '');
});

test('disabled animation closes without waiting; unmount cancels pending callback', async () => {
  let calls = 0;
  await mount({ message: '提示', closable: true, onClose: () => calls++ });
  container.querySelector('[role="alert"]').style.animationName = 'none';
  await act(() => container.querySelector('button').click());
  await act(() => new Promise(resolve => setTimeout(resolve, 10)));
  assert.equal(calls, 1);
  assert.equal(container.innerHTML, '');
  await act(() => root.unmount()); root = undefined;
  container.remove();
  await mount({ message: '提示', closable: true, onClose: () => calls++ });
  await act(() => container.querySelector('button').click());
  await act(() => root.unmount()); root = undefined;
  assert.equal(calls, 1);
});

test('styles only consume Alert tokens; semantic references exist in both themes', async () => {
  const css = postcss.parse(await readFile(path.join(project, 'src/components/alert/styles.css'), 'utf8'));
  css.walkDecls(d => {
    assert.match(d.value, /var\(--alert-/);
    for (const match of d.value.matchAll(/var\((--[\w-]+)/g)) assert(match[1].startsWith('--alert-'));
  });
  const tokens = postcss.parse((await readFile(path.join(project, 'src/components/alert/design.tokens.css'), 'utf8')) + (await readFile(path.join(project, 'src/components/alert/tokens.css'), 'utf8')));
  const names = new Set(Object.keys(getAlertSizeStyle({ base: 'base', sm: 'sm', md: 'sm', lg: 'lg', xl: 'xl', '2xl': '2xl' })));
  tokens.walkDecls(d => names.add(d.prop));
  css.walkDecls(d => { for (const match of d.value.matchAll(/var\((--alert-[\w-]+)/g)) assert(names.has(match[1]), match[1]); });
  for (const theme of ['light', 'dark']) {
    const sources = await Promise.all(['radius', 'typography', 'colors'].map(name => readFile(path.join(project, `src/components/themes/${theme}/semantic/${name}.css`), 'utf8')));
    tokens.walkDecls(d => { for (const match of d.value.matchAll(/var\((--(?!alert-)[\w-]+)/g)) assert(sources.join('\n').includes(`${match[1]}:`), match[1]); });
  }
});

test('all typography line heights referenced by Alert are lengths in both themes', async () => {
  const design = postcss.parse(await readFile(path.join(project, 'src/components/alert/design.tokens.css'), 'utf8'));
  const references = [];
  design.walkDecls(/^--alert-size-.*-line-height$/, d => {
    const match = /^var\((--text-[\w-]+-line-height)\)$/.exec(d.value);
    assert(match, d.value);
    references.push(match[1]);
  });
  assert.equal(references.length, 7);
  for (const theme of ['light', 'dark']) {
    const typography = postcss.parse(await readFile(path.join(project, `src/components/themes/${theme}/semantic/typography.css`), 'utf8'));
    const values = new Map();
    typography.walkDecls(d => values.set(d.prop, d.value));
    for (const name of references) assert.match(values.get(name), /^\d+(?:\.\d+)?(?:px|rem)$/, `${theme}/${name}`);
  }
});

test('boolean slots and empty description do not render empty wrappers; close label includes context', () => {
  const doc = new JSDOM(renderToStaticMarkup(h(Alert, { message: '余额不足', prefixIcon: false, suffixIcon: true, action: false, description: '', closable: true })));
  assert.equal(doc.window.document.querySelectorAll('.bkreact-alert__icon, .bkreact-alert__action, .bkreact-alert__description').length, 0);
  assert.equal(doc.window.document.querySelector('button').getAttribute('aria-label'), '关闭提示：余额不足');
  assert(doc.window.document.querySelector('.bkreact-alert__close .bkreact-icon svg'));
  doc.window.close();
});

test('stable callback ref retains React 19 cleanup and does not detach on rerender', async () => {
  const nodes = [];
  let cleanups = 0;
  const ref = node => { nodes.push(node); return () => cleanups++; };
  await mount({ message: '原消息', ref });
  const element = container.firstElementChild;
  await act(() => root.render(h(Alert, { message: '新消息', ref, size: 'lg' })));
  assert.deepEqual(nodes, [element]);
  assert.equal(cleanups, 0);
  await act(() => root.unmount()); root = undefined;
  assert.equal(cleanups, 1);
});

test('close stays hidden after props change; a new key creates an open instance', async () => {
  await mount({ message: '原消息', closable: true });
  await act(() => container.querySelector('button').click());
  await act(() => animationEnd(container.firstElementChild));
  await act(() => root.render(h(Alert, { message: '新消息', size: 'lg', closable: true })));
  assert.equal(container.innerHTML, '');
  await act(() => root.render(h(Alert, { key: 'new', message: '新消息', closable: true })));
  assert.equal(container.firstElementChild.dataset.state, 'open');
});

test('fallback waits only for close animation and repeats shorter CSS lists', async t => {
  let calls = 0;
  // 关闭动画位于第三项，duration/delay 通过循环匹配分别为 30ms/-10ms。
  t.mock.method(globalThis, 'getComputedStyle', () => ({
    animationName: 'shimmer, pulse, bk-alert-close',
    animationDuration: '30ms, 10s',
    animationDelay: '-10ms, 0s',
  }));
  await mount({ message: '提示', closable: true, onClose: () => calls++ });
  await act(() => container.querySelector('button').click());
  assert.equal(calls, 0);
  await act(() => new Promise(resolve => setTimeout(resolve, 50)));
  assert.equal(calls, 1);
  assert.equal(container.innerHTML, '');
});

test('unrelated animation alone does not delay closing', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'getComputedStyle', () => ({ animationName: 'shimmer', animationDuration: '10s', animationDelay: '0s' }));
  await mount({ message: '提示', closable: true, onClose: () => calls++ });
  await act(() => container.querySelector('button').click());
  await act(() => new Promise(resolve => setTimeout(resolve, 10)));
  assert.equal(calls, 1);
});
