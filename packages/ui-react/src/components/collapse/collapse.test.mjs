import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let dom, directory, Collapse, CollapseItem, createRoot, root, container, user, waitFor;
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  await mkdir(fileURLToPath(new URL('../../../../../.test-output/', import.meta.url)), { recursive: true });
  directory = await mkdtemp(fileURLToPath(new URL('../../../../../.test-output/collapse-', import.meta.url)));
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(directory, 'collapse.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Collapse, CollapseItem } = await import(file));
  ({ createRoot } = await import('react-dom/client'));
  const { userEvent, waitFor: waitForAssertion } = await import('storybook/test');
  waitFor = waitForAssertion;
  user = userEvent.setup({ document: dom.window.document });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  container?.remove();
});
after(async () => { dom.window.close(); await rm(directory, { recursive: true, force: true }); });
function items() {
  return ['a', 'b', 'c'].map(value => h(CollapseItem, { key: value, value, title: `Title ${value}`, disabled: value === 'c' }, `Content ${value}`));
}
async function render(props = {}) {
  if (!root) {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  }
  await act(async () => root.render(h(Collapse, props, items())));
  return [...container.querySelectorAll('button')];
}
const expanded = button => button.getAttribute('aria-expanded') === 'true';
async function click(button) { await act(async () => button.click()); }

test('默认展开、多选切换、ARIA 关联及禁用项', async () => {
  const changes = [];
  const buttons = await render({ defaultValue: ['a'], onChange: value => changes.push(value) });
  assert.deepEqual(buttons.map(expanded), [true, false, false]);
  const panel = document.getElementById(buttons[0].getAttribute('aria-controls'));
  assert.equal(panel.getAttribute('aria-labelledby'), buttons[0].id);
  await click(buttons[1]);
  assert.deepEqual(buttons.map(expanded), [true, true, false]);
  assert.deepEqual(changes.at(-1), ['a', 'b']);
  await click(buttons[0]);
  assert.deepEqual(changes.at(-1), ['b']);
  await click(buttons[2]);
  assert.deepEqual(buttons.map(expanded), [false, true, false]);
});
test('手风琴仅保留一个展开项，且允许全部收起', async () => {
  const changes = [];
  const buttons = await render({ accordion: true, defaultValue: ['a', 'b'], onChange: value => changes.push(value) });
  assert.deepEqual(buttons.map(expanded), [true, false, false]);
  await click(buttons[1]);
  assert.deepEqual(buttons.map(expanded), [false, true, false]);
  assert.deepEqual(changes.at(-1), ['b']);
  await click(buttons[1]);
  assert.deepEqual(buttons.map(expanded), [false, false, false]);
  assert.deepEqual(changes.at(-1), []);
});
test('受控模式等待父级更新，根节点 ref、响应式尺寸及 DOM 属性可用', async () => {
  const ref = createRef(); let next;
  const props = { value: ['a'], onChange: value => { next = value; }, ref, size: { base: 'xs', md: 'lg' }, variant: 'fill', 'aria-label': 'Help' };
  const buttons = await render(props);
  await click(buttons[1]);
  assert.deepEqual(next, ['a', 'b']);
  assert.equal(expanded(buttons[1]), false);
  await render({ ...props, value: next });
  assert.equal(expanded(buttons[1]), true);
  assert.equal(ref.current.getAttribute('aria-label'), 'Help');
  assert.equal(ref.current.dataset.variant, 'fill');
  assert.equal(ref.current.dataset.sizeMd, 'true');
  assert.equal(ref.current.style.getPropertyValue('--collapse-md-font-size'), 'var(--collapse-size-lg-font-size)');
});
test('整体禁用阻止状态改变', async () => {
  const buttons = await render({ disabled: true, defaultValue: ['a'] });
  for (const button of buttons) await click(button);
  assert.deepEqual(buttons.map(expanded), [true, false, false]);
});
test('Tab 聚焦标题，Enter 和 Space 切换展开状态', async () => {
  const buttons = await render();
  await act(async () => { await user.tab(); });
  assert.equal(document.activeElement, buttons[0]);
  await act(async () => { await user.keyboard('{Enter}'); });
  assert.equal(expanded(buttons[0]), true);
  await act(async () => { await user.keyboard(' '); });
  assert.equal(expanded(buttons[0]), false);
});
test('嵌套面板使用独立状态和图标配置', async () => {
  await render({ value: ['outer'] });
  await act(async () => root.render(h(Collapse, { value: ['outer'] },
    h(Collapse.Item, { value: 'outer', title: 'Outer' }, h(Collapse, { icons: { open: 'minus', close: 'plus' } },
      h(Collapse.Item, { value: 'inner', title: 'Inner' }, 'Nested content'))))));
  const buttons = [...container.querySelectorAll('button')];
  await click(buttons[1]);
  assert.deepEqual(buttons.map(expanded), [true, true]);
});
test('keepMounted 保留表单内容，默认面板收起时卸载', async () => {
  await render({ value: ['outer'] });
  await act(async () => root.render(h(Collapse, { key: 'mount-test', defaultValue: ['a', 'b'] },
    h(CollapseItem, { value: 'a', title: 'Persist', keepMounted: true }, h('input', { defaultValue: 'initial' })),
    h(CollapseItem, { value: 'b', title: 'Unmount' }, 'Temporary content'))));
  const buttons = [...container.querySelectorAll('button')];
  const input = container.querySelector('input');
  input.value = 'edited';
  await click(buttons[0]);
  await click(buttons[1]);
  // 等待 Base UI 完成关闭并卸载，避免依赖固定的动画帧数。
  await waitFor(() => assert.equal(container.textContent.includes('Temporary content'), false));
  assert.equal(container.querySelector('input'), input);
  assert.equal(input.value, 'edited');
  assert.equal(container.textContent.includes('Temporary content'), false);
  await click(buttons[0]);
  assert.equal(container.querySelector('input').value, 'edited');
});
test('七档字符串尺寸只写入 base 变量，不匹配响应式断点选择器', async () => {
  const ref = createRef();
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    await render({ ref, size });
    assert.equal(ref.current.dataset.size, size);
    for (const dimension of ['font-size', 'line-height', 'padding-x', 'padding-y', 'gap', 'icon-size']) {
      assert.equal(ref.current.style.getPropertyValue(`--collapse-base-${dimension}`), `var(--collapse-size-${size}-${dimension})`);
    }
    for (const breakpoint of ['sm', 'md', 'lg', 'xl', '2xl']) {
      assert.equal(ref.current.hasAttribute(`data-size-${breakpoint}`), false);
      assert.equal(ref.current.style.getPropertyValue(`--collapse-${breakpoint}-font-size`), '');
    }
  }
});
test('部分 icons 配置保留默认图标，ghost 与展开状态使用正确图标', async () => {
  const { getIconDefinition } = await import('@bkreact/assets/icons');
  const buttons = await render({ variant: 'ghost', icons: { open: 'minus' } });
  assert.equal(container.firstElementChild.dataset.variant, 'ghost');
  const open = buttons[0].querySelector('.bkreact-collapse__icon-open path');
  const close = buttons[0].querySelector('.bkreact-collapse__icon-close path');
  assert.equal(open.getAttribute('d'), getIconDefinition('minus').paths[0].d);
  assert.equal(close.getAttribute('d'), getIconDefinition('small_down_arrow').paths[0].d);
  assert.equal(buttons[0].hasAttribute('data-panel-open'), false);
  await click(buttons[0]);
  assert.equal(buttons[0].hasAttribute('data-panel-open'), true);
  await render({ icons: { close: 'plus' } });
  assert.equal(buttons[0].querySelector('.bkreact-collapse__icon-open path').getAttribute('d'), getIconDefinition('small_up_arrow').paths[0].d);
  assert.equal(buttons[0].querySelector('.bkreact-collapse__icon-close path').getAttribute('d'), getIconDefinition('plus').paths[0].d);
});
test('标题默认 h3，可通过 headerLevel 调整语义层级', async () => {
  const buttons = await render();
  assert.equal(buttons[0].parentElement.tagName, 'H3');
  await act(async () => root.render(h(Collapse, null,
    h(CollapseItem, { value: 'heading', title: 'Heading', headerLevel: 2 }, 'Content'))));
  assert.equal(container.querySelector('button').parentElement.tagName, 'H2');
  assert.equal(container.querySelector('[headerlevel]'), null);
});
test('手风琴受控值仅使用第一项，运行时切换遵循相同约定', async () => {
  const props = { value: ['a', 'b'] };
  const buttons = await render(props);
  assert.deepEqual(buttons.map(expanded), [true, true, false]);
  await render({ ...props, accordion: true });
  assert.deepEqual(buttons.map(expanded), [true, false, false]);
  await render({ value: ['b', 'a'], accordion: true });
  assert.deepEqual(buttons.map(expanded), [false, true, false]);
});
