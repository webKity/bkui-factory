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
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove(); container = undefined;
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });

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
