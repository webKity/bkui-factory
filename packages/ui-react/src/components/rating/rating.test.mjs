import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let Rating, createRoot, dom, temporary, root, container;
const globals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });

  for (const name of globals) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await mkdir(fileURLToPath(new URL('../../../../../.test-output/', import.meta.url)), {
    recursive: true,
  });
  temporary = await mkdtemp(
    fileURLToPath(new URL('../../../../../.test-output/rating-', import.meta.url)),
  );
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    write: false,
  });
  const file = `${temporary}/rating.mjs`;
  await writeFile(file, result.outputFiles[0].contents);
  ({ Rating } = await import(file));
  ({ createRoot } = await import('react-dom/client'));
});

afterEach(async () => {
  if (root) await act(() => root.unmount());

  container?.remove();
  root = container = undefined;
});

after(async () => {
  dom?.window.close();

  for (const name of globals) delete globalThis[name];

  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  delete globalThis.CSS;

  if (temporary) await rm(temporary, { recursive: true, force: true });
});

async function render(props) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }

  await act(() => root.render(h(Rating, props)));

  return container.querySelector('.bk-rating');
}

const radios = () => [...container.querySelectorAll('input')];

const filled = () => container.querySelectorAll('[data-filled]').length;

const selected = () => container.querySelector('input:checked')?.value;

async function hover(index) {
  await act(() =>
    radios()[index].parentElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })),
  );
}

test('非受控选择、去重回调、原生表单字段与 ref', async () => {
  const changes = [],
    ref = createRef();
  const rating = await render({
    defaultValue: 2,
    name: 'score',
    ref,
    onChange: value => changes.push(value),
  });
  assert.equal(ref.current, rating);
  assert.equal(rating.getAttribute('role'), 'radiogroup');
  assert.equal(radios().length, 5);
  assert.equal(selected(), '2');
  await act(() => radios()[3].click());
  await act(() => radios()[3].click());
  assert.equal(selected(), '4');
  assert.equal(filled(), 4);
  assert.deepEqual(changes, [4]);
  const form = document.createElement('form');
  form.append(rating);
  assert.equal(new dom.window.FormData(form).get('score'), '4');
  container.append(rating);
});

test('受控选择通知父级，等待 value 更新；defaultValue 只用于初始化', async () => {
  const changes = [];
  await render({ value: 2, onChange: value => changes.push(value) });
  await act(() => radios()[4].click());
  assert.equal(selected(), '2');
  assert.deepEqual(changes, [5]);
  await render({ value: 5 });
  assert.equal(selected(), '5');
});

test('click 模式悬停仅预览，移出恢复；hover 模式提交', async () => {
  const changes = [];
  await render({ defaultValue: 2, onChange: value => changes.push(value) });
  await hover(3);
  assert.equal(filled(), 4);
  assert.equal(selected(), '2');
  assert.deepEqual(changes, []);
  await act(() =>
    container.firstElementChild.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    ),
  );
  assert.equal(filled(), 2);
  await render({ trigger: 'hover', onChange: value => changes.push(value) });
  await hover(4);
  await hover(4);
  assert.equal(selected(), '5');
  assert.deepEqual(changes, [5]);
});

test('禁用和只读不能修改评分，只读不产生表单控件', async () => {
  let changes = 0;
  await render({ disabled: true, trigger: 'hover', defaultValue: 3, onChange: () => changes++ });
  assert(radios().every(input => input.disabled));
  await act(() => radios()[4].click());
  await hover(4);
  assert.equal(selected(), '3');
  assert.equal(changes, 0);
  const rating = await render({ readOnly: true, disabled: true, value: 4 });
  assert.equal(radios().length, 0);
  assert.equal(filled(), 4);
  assert.equal(rating.getAttribute('role'), 'meter');
  assert.equal(rating.getAttribute('aria-label'), '评分：4 / 5');
  assert.equal(rating.getAttribute('aria-valuenow'), '4');
  assert.equal(rating.getAttribute('aria-valuemin'), '0');
  assert.equal(rating.getAttribute('aria-valuemax'), '5');
  assert.equal(rating.getAttribute('aria-valuetext'), '4 / 5');
  assert.equal(rating.hasAttribute('aria-disabled'), false);
  assert(
    [...rating.querySelectorAll('.bk-rating__item')].every(
      item => item.getAttribute('aria-hidden') === 'true',
    ),
  );
});

test('受控 hover 在父级回写前去重，允许不同分值和回写后再次选择', async () => {
  const changes = [];

  const onChange = value => changes.push(value);

  await render({ value: 2, trigger: 'hover', onChange });
  await hover(3);
  await act(() =>
    container.firstElementChild.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    ),
  );
  await hover(3);
  assert.deepEqual(changes, [4]);
  await hover(4);
  await hover(3);
  assert.deepEqual(changes, [4, 5, 4]);
  await hover(1); // 返回当前已选值后，再次选择 4 是新的选择。
  await hover(3);
  assert.deepEqual(changes, [4, 5, 4, 4]);
  await render({ value: 3, trigger: 'hover', onChange });
  await hover(3);
  assert.deepEqual(changes, [4, 5, 4, 4, 4]);
});

test('外部 value 或 count 更新时清除 click 预览', async () => {
  await render({ value: 2 });
  await hover(3);
  assert.equal(filled(), 4);
  await render({ value: 5 });
  assert.equal(selected(), '5');
  assert.equal(filled(), 5);
  await hover(1);
  await render({ value: 5, count: 3 });
  assert.equal(selected(), '3');
  assert.equal(filled(), 3);
});

test('整体与选项名称支持国际化，显式 aria-label 优先，只读不调用选项函数', async () => {
  const getAriaLabel = (value, total) => `Score: ${value} of ${total}`;

  let itemCalls = 0;

  const getItemAriaLabel = value => {
    itemCalls++;
    return `${value} stars`;
  };

  let rating = await render({ value: 2, getAriaLabel, getItemAriaLabel });
  assert.equal(rating.getAttribute('aria-label'), 'Score: 2 of 5');
  assert.equal(radios()[3].getAttribute('aria-label'), '4 stars');
  assert.equal(rating.hasAttribute('aria-valuenow'), false);
  rating = await render({ value: 3, getAriaLabel });
  assert.equal(rating.getAttribute('aria-label'), 'Score: 3 of 5');
  itemCalls = 0;
  rating = await render({ value: 4, readOnly: true, getAriaLabel, getItemAriaLabel });
  assert.equal(rating.getAttribute('aria-label'), 'Score: 4 of 5');
  assert.equal(itemCalls, 0);
  rating = await render({ value: 4, readOnly: true, getAriaLabel, 'aria-label': 'Review score' });
  assert.equal(rating.getAttribute('aria-label'), 'Review score');
});

test('边界归一化与响应式尺寸，忽略外部样式', async () => {
  const rating = await render({
    count: 0,
    value: Infinity,
    size: { base: 'sm', lg: 'xl' },
    style: { '--rating-gap': '10px' },
  });
  assert.equal(radios().length, 5);
  assert.equal(filled(), 0);
  assert(rating.hasAttribute('data-size-lg'));
  assert(!rating.hasAttribute('data-size-md'));
  assert.equal(
    rating.style.getPropertyValue('--rating-base-icon-size'),
    'var(--rating-size-sm-icon-size)',
  );
  assert.equal(rating.style.getPropertyValue('--rating-gap'), '');
  await render({ count: 3, value: 99 });
  assert.equal(selected(), '3');
  await render({ count: 3, value: -1 });
  assert.equal(selected(), undefined);
});

// JSDOM 不计算 CSS 布局与媒体查询；此处仅验证键盘和表单语义。
test('原生单选框支持 Tab、方向键与空格，不同实例使用独立分组', async () => {
  const { userEvent } = await import('storybook/test');
  // Storybook 提供 CSS.escape polyfill；JSDOM 的 window 需显式共享。
  dom.window.CSS = globalThis.CSS;
  const user = userEvent.setup({ document });
  const changes = [];
  await render({ defaultValue: 2, onChange: value => changes.push(value) });
  await act(async () => {
    await user.tab();
  });
  assert.equal(document.activeElement, radios()[1]);
  await act(async () => {
    await user.keyboard('{ArrowRight}');
  });
  assert.equal(document.activeElement, radios()[2]);
  assert.equal(selected(), '3');
  assert.deepEqual(changes, [3]);
  await act(() => root.render(h('div', null, h(Rating), h(Rating))));
  const groups = container.querySelectorAll('.bk-rating');
  const first = groups[0].querySelector('input');
  const second = groups[1].querySelector('input');
  assert.notEqual(first.name, second.name);
  first.focus();
  await act(async () => {
    await user.keyboard(' ');
  });
  assert.equal(first.checked, true);
  assert.equal(second.checked, false);
});
