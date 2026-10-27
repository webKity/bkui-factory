import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
let BKIcon, figmaIcons, figmaIconNames, iconNames, paths, temporary, dom, createRoot, hydrateRoot, root, container, AllIcons;

before(async () => {
  await mkdir(path.join(projectRoot, '.test-output'), { recursive: true });
  temporary = await mkdtemp(path.join(projectRoot, '.test-output/icon-'));
  const result = await build({
    stdin: { contents: `export * from './src/components/icon/index'; export {figmaIcons} from './src/components/icon/figma'; export {paths} from './src/components/icon/path'; export {AllIcons} from './src/components/icon/Icon.stories';`, resolveDir: projectRoot },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'icons.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ BKIcon, figmaIcons, figmaIconNames, iconNames, paths, AllIcons } = await import(file));
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot, hydrateRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
});
after(async () => { dom?.window.close(); await rm(temporary, { recursive: true, force: true }); });

function parse(element) {
  return new JSDOM(renderToStaticMarkup(element)).window.document;
}

test('472 个 SVG 与 Figma 原始导出的路径、填充规则和 viewBox 一一对应，无名称覆盖', async () => {
  const source = JSON.parse(await readFile(path.join(projectRoot, '../../source/icons/figma-icons.json'), 'utf8'));
  assert.equal(figmaIconNames.length, 236);
  assert.equal(source.icons.length, 472);
  assert.equal(new Set(iconNames).size, iconNames.length);
  const coverage = new Set();
  for (const original of source.icons) {
    const name = figmaIconNames.find(name => figmaIcons[name].groupId === original.groupId);
    assert(name, original.groupName);
    assert.equal(figmaIcons[name][original.variant].nodeId, original.nodeId);
    const expectedDom = new JSDOM(original.svg, { contentType: 'image/svg+xml' });
    const actualDom = new JSDOM(renderToStaticMarkup(h(BKIcon, { name, variant: original.variant, renderInServer: true })));
    const expected = expectedDom.window.document.querySelector('svg');
    const actual = actualDom.window.document.querySelector('svg');
    assert.equal(actual.getAttribute('viewBox'), expected.getAttribute('viewBox'), original.nodeId);
    const aPaths = [...actual.querySelectorAll('path')];
    const ePaths = [...expected.querySelectorAll('path')];
    assert.equal(aPaths.length, ePaths.length);
    ePaths.forEach((p, index) => {
      for (const attr of ['d', 'fill-rule', 'clip-rule']) assert.equal(aPaths[index].getAttribute(attr), p.getAttribute(attr), `${original.nodeId}: ${attr}`);
      const fill = p.getAttribute('fill');
      assert.equal(aPaths[index].getAttribute('fill'), fill === 'black' ? 'currentColor' : fill === 'none' ? 'none' : fill);
    });
    coverage.add(original.nodeId);
    expectedDom.window.close(); actualDom.window.close();
  }
  assert.equal(coverage.size, 472);
});

test('旧名称保持 1024 坐标，显式 variant 使用 Figma 24 坐标；非法名称不渲染', () => {
  for (const name of Object.keys(paths)) {
    const d = parse(h(BKIcon, { name, renderInServer: true }));
    assert.equal(d.querySelector('svg').getAttribute('viewBox'), '0 0 1024 1024');
    assert.deepEqual([...d.querySelectorAll('path')].map(p => p.getAttribute('d')), typeof paths[name] === 'string' ? [paths[name]] : paths[name]);
  }
  const shared = figmaIconNames.find(name => Object.hasOwn(paths, name));
  assert(shared);
  assert.equal(parse(h(BKIcon, { name: shared, variant: 'filled', renderInServer: true })).querySelector('svg').getAttribute('viewBox'), '0 0 24 24');
  for (const name of ['missing', '__proto__', 'constructor']) assert.equal(renderToStaticMarkup(h(BKIcon, { name, renderInServer: true })), '');
});

test('SSR 占位支持数字和 CSS 字符串尺寸；renderInServer 直接输出 SVG 和无障碍名称', () => {
  for (const [size, expected] of [[24, '24px'], ['1.5em', '1.5em'], ['100%', '100%']]) {
    const d = parse(h(BKIcon, { name: 'search', size }));
    assert.equal(d.querySelector('svg'), null);
    assert.equal(d.querySelector('span').style.width, expected);
    assert.equal(d.querySelector('span').style.height, expected);
    assert.equal(d.querySelector('span').getAttribute('aria-hidden'), 'true');
  }
  const named = parse(h(BKIcon, { name: 'search', variant: 'regular', renderInServer: true, ariaLabel: '搜索', size: '2em' })).querySelector('svg');
  assert.equal(named.getAttribute('aria-label'), '搜索');
  assert.equal(named.getAttribute('role'), 'img');
  assert.equal(named.getAttribute('width'), '2em');
  assert.equal(named.getAttribute('aria-hidden'), null);
  assert.equal(parse(h(BKIcon, { name: 'search', renderInServer: true })).querySelector('svg').getAttribute('aria-hidden'), 'true');
});

test('空闲加载可水合且不会产生不匹配，卸载时取消回调', async () => {
  let callback, canceled;
  window.requestIdleCallback = fn => { callback = fn; return 42; };
  window.cancelIdleCallback = id => { canceled = id; };
  const element = h(BKIcon, { name: 'search', variant: 'filled', size: '2em' });
  container = document.createElement('div'); document.body.append(container);
  container.innerHTML = renderToString(element);
  const errors = [];
  await act(() => { root = hydrateRoot(container, element, { onRecoverableError: e => errors.push(e) }); });
  assert.equal(container.querySelector('svg'), null);
  await act(() => callback());
  assert(container.querySelector('svg'));
  assert.equal(container.querySelector('[data-placeholder]'), null);
  assert.equal(container.querySelector('span').style.width, '2em');
  assert.deepEqual(errors, []);
  await act(() => root.unmount()); root = undefined;
  assert.equal(canceled, 42);
});

test('不支持 requestIdleCallback 时也能加载，保留颜色、hover、class、原生属性和点击事件', async () => {
  let clicks = 0;
  container = document.createElement('div'); document.body.append(container);
  const originalSetTimeout = window.setTimeout;
  let makeReady;
  window.setTimeout = callback => { makeReady = callback; return 42; };
  try {
    await act(() => { root = createRoot(container); root.render(h(BKIcon, {
      name: 'heart', variant: 'filled', color: 'red', hoverColor: 'blue', className: 'custom',
      'data-testid': 'favorite', ariaLabel: '收藏', onClick: () => clicks++,
    })); });
    assert.equal(container.querySelector('svg'), null);
    assert.equal(typeof makeReady, 'function');
    await act(() => makeReady());
  } finally {
    window.setTimeout = originalSetTimeout;
  }
  const span = container.querySelector('span');
  assert(container.querySelector('svg'));
  assert(span.classList.contains('custom'));
  assert.equal(span.dataset.testid, 'favorite');
  assert.equal(span.style.getPropertyValue('--bk-icon-color'), 'red');
  assert.equal(span.style.getPropertyValue('--bk-icon-hover-color'), 'blue');
  assert(span.hasAttribute('data-hover-color'));
  await act(() => span.click());
  assert.equal(clicks, 1);
});


test('图标预览完整呈现两种样式，支持英文和中文搜索', async () => {
  const { userEvent, within } = await import('storybook/test');
  container = document.createElement('div'); document.body.append(container);
  await act(() => { root = createRoot(container); root.render(h(AllIcons.render)); });
  assert.equal(container.querySelectorAll('svg').length, 472);
  const input = within(container).getByRole('searchbox');
  const user = userEvent.setup({ document });
  await act(async () => { await user.type(input, 'search'); });
  assert.equal(container.querySelectorAll('svg').length, 2);
  assert.equal(container.querySelector('code').textContent, 'search');
  await act(async () => { await user.clear(input); await user.type(input, '警告'); });
  assert(container.querySelectorAll('svg').length > 0);
  await act(async () => { await user.clear(input); await user.type(input, 'no-such-icon-xyz'); });
  assert.equal(container.querySelectorAll('svg').length, 0);
});
