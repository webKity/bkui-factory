import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let Pagination, getPaginationPages, createRoot, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'HTMLAnchorElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  const directory = fileURLToPath(new URL('../../../.test-output/', import.meta.url));
  await mkdir(directory, { recursive: true });
  temporary = await mkdtemp(path.join(directory, 'pagination-'));
  const bundle = async (entry, name) => {
    const result = await build({ entryPoints: [fileURLToPath(new URL(entry, import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
    const file = path.join(temporary, `${name}.mjs`);
    await writeFile(file, result.outputFiles[0].contents);
    return import(file);
  };
  ({ Pagination } = await bundle('./index.tsx', 'pagination'));
  ({ getPaginationPages } = await bundle('./pages.ts', 'pages'));
});

afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});

after(async () => {
  dom?.window.close();
  for (const name of globals) delete globalThis[name];
  delete globalThis.getComputedStyle;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

async function render(props) {
  if (!container) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(h(Pagination, props)));
  return container.querySelector('nav');
}

function item(label) { return container.querySelector(`[aria-label="${label}"]`); }
async function click(element, options = {}) {
  const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, ...options });
  await act(() => element.dispatchEvent(event));
  return event;
}

test('页码窗口保留首尾、边界和中间省略号', () => {
  assert.deepEqual(getPaginationPages(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPaginationPages(1, 20), [1, 2, 3, 4, 5, 6, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationPages(10, 20), [1, 'ellipsis-start', 8, 9, 10, 11, 12, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationPages(20, 20), [1, 'ellipsis-start', 15, 16, 17, 18, 19, 20]);
  assert.deepEqual(getPaginationPages(5, 10), [1, 2, 3, 4, 5, 6, 7, 'ellipsis-end', 10]);
  assert.deepEqual(getPaginationPages(1, 0), []);
});

test('不同窗口和大页数均生成有序、唯一且包含当前页的有限区间', () => {
  for (const total of [1, 5, 20, 100, 1_000_000_000]) {
    for (const current of [1, Math.ceil(total / 2), total]) {
      for (const count of [0, 5, 6, 9, NaN, Infinity]) {
        const entries = getPaginationPages(current, total, count);
        const pages = entries.filter(entry => typeof entry === 'number');
        assert(pages.includes(current));
        assert.equal(pages[0], 1);
        assert.equal(pages.at(-1), total);
        assert.deepEqual(pages, [...new Set(pages)].sort((a, b) => a - b));
        assert(entries.length <= 13);
      }
    }
  }
});

test('受控切页仅通知调用方，更新 current 后才改变活动页', async () => {
  const changes = [];
  const props = { current: 1, totalPage: 20, onChange: page => changes.push(page) };
  await render(props);
  assert(item('上一页').disabled);
  await click(item('下一页'));
  assert.deepEqual(changes, [2]);
  assert.equal(item('第 1 页').getAttribute('aria-current'), 'page');
  await render({ ...props, current: 2 });
  assert.equal(item('第 2 页').getAttribute('aria-current'), 'page');
  await click(item('第 2 页'));
  assert.deepEqual(changes, [2]);
  await click(item('上一页'));
  assert.deepEqual(changes, [2, 1]);
});

test('末页、空数据、单页和整体禁用均阻止越界切页', async () => {
  const changes = [];
  for (const props of [{ current: 10, totalPage: 10 }, { current: 1, totalPage: 0 }, { current: 1, totalPage: 1 }, { current: 3, totalPage: 10, disabled: true }]) {
    await render({ ...props, onChange: page => changes.push(page) });
    assert(item('下一页').disabled);
    await click(item('下一页'));
    if (props.totalPage <= 1) assert(item('上一页').disabled);
    if (props.disabled) for (const button of container.querySelectorAll('button')) assert(button.disabled);
  }
  assert.deepEqual(changes, []);
});

test('异常页数归一化且不自行触发 onChange', async () => {
  const changes = [];
  await render({ current: 99, totalPage: 5.9, onChange: page => changes.push(page) });
  assert.equal(item('第 5 页').getAttribute('aria-current'), 'page');
  await render({ current: NaN, totalPage: 5 });
  assert.equal(item('第 1 页').getAttribute('aria-current'), 'page');
  await render({ current: -5, totalPage: Infinity });
  assert.equal(container.querySelectorAll('button').length, 2);
  assert.deepEqual(changes, []);
});

test('动态属性覆盖静态属性，并按目标页和类型传入', async () => {
  const calls = [];
  await render({ current: 2, totalPage: 5, itemProps: { 3: { title: 'static', className: 'custom' } }, getItemProps: (page, type) => { calls.push([page, type]); return page === 3 ? { title: type } : undefined; } });
  assert.equal(item('第 3 页').title, 'page');
  assert.equal(item('下一页').title, 'next');
  assert(item('第 3 页').classList.contains('custom'));
  assert(calls.some(([page, type]) => page === 1 && type === 'previous'));
});

test('逐项禁用与 preventDefault 阻止切页', async () => {
  const changes = [];
  let clicked = 0;
  await render({ current: 1, totalPage: 5, onChange: page => changes.push(page), itemProps: { 2: { disabled: true }, 3: { onClick: event => { clicked++; event.preventDefault(); } } } });
  assert(item('第 2 页').disabled);
  assert(item('下一页').disabled);
  await click(item('第 2 页'));
  await click(item('第 3 页'));
  assert.equal(clicked, 1);
  assert.deepEqual(changes, []);
});

test('链接保留 href、target 与修饰键行为；普通点击触发受控通知', async () => {
  const changes = [];
  await render({ current: 1, totalPage: 5, as: 'a', getItemProps: page => ({ href: `#page-${page}`, target: '_blank', rel: 'noreferrer' }), onChange: page => changes.push(page) });
  const link = item('第 2 页');
  assert.equal(link.tagName, 'A');
  assert.equal(link.getAttribute('href'), '#page-2');
  assert.equal(link.target, '_blank');
  assert.equal((await click(link, { ctrlKey: true })).defaultPrevented, false);
  assert.deepEqual(changes, []);
  assert.equal((await click(link)).defaultPrevented, false);
  assert.deepEqual(changes, [2]);
});

test('禁用链接移除 href 并退出 Tab 顺序，无地址链接阻止默认跳转', async () => {
  const changes = [];
  await render({ current: 1, totalPage: 5, as: 'a', getItemProps: page => ({ href: `#page-${page}` }), onChange: page => changes.push(page) });
  assert.equal(item('上一页').getAttribute('href'), null);
  assert.equal(item('上一页').getAttribute('aria-disabled'), 'true');
  assert.equal(item('上一页').tabIndex, -1);
  assert.equal((await click(item('上一页'))).defaultPrevented, true);
  await render({ current: 1, totalPage: 5, as: 'a', onChange: page => changes.push(page) });
  assert.equal((await click(item('第 2 页'))).defaultPrevented, true);
  assert.deepEqual(changes, [2]);
});

test('导航 ref、自定义类名和响应式 Button 尺寸可用', async () => {
  const ref = createRef();
  const nav = await render({ current: 1, totalPage: 5, ref, className: 'custom-pagination', size: { base: 'xs', md: 'lg' } });
  assert.equal(ref.current, nav);
  assert.equal(nav.getAttribute('aria-label'), 'Pagination');
  assert(nav.classList.contains('custom-pagination'));
  const button = item('第 1 页');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('data-intent'), 'brand');
  assert.equal(button.style.getPropertyValue('--button-base-height'), 'var(--button-size-xs-height)');
  assert.equal(button.style.getPropertyValue('--button-md-height'), 'var(--button-size-lg-height)');
});
