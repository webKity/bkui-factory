import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import { renderToString } from 'react-dom/server';
import postcss from 'postcss';

let Pagination,
  Playground,
  getPaginationSizeStyle,
  getPaginationPages,
  createRoot,
  dom,
  temporary,
  root,
  container;
const globals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLAnchorElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test',
    pretendToBeVisual: true,
  });

  for (const name of globals) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }

  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  const directory = fileURLToPath(new URL('../../../.test-output/', import.meta.url));
  await mkdir(directory, { recursive: true });
  temporary = await mkdtemp(path.join(directory, 'pagination-'));

  const bundle = async (entry, name) => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(entry, import.meta.url))],
      bundle: true,
      packages: 'external',
      platform: 'node',
      format: 'esm',
      jsx: 'automatic',
      loader: { '.css': 'empty' },
      write: false,
    });
    const file = path.join(temporary, `${name}.mjs`);
    await writeFile(file, result.outputFiles[0].contents);

    return import(file);
  };

  ({ Pagination } = await bundle('./index.tsx', 'pagination'));
  ({ getPaginationPages } = await bundle('./pages.ts', 'pages'));
  ({ getPaginationSizeStyle } = await bundle('./size.ts', 'size'));
  ({ Playground } = await bundle('./Pagination.stories.tsx', 'stories'));
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

function item(label) {
  return container.querySelector(`[aria-label="${label}"]`);
}

async function click(element, options = {}) {
  const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, ...options });
  await act(() => element.dispatchEvent(event));

  return event;
}

test('页码窗口保留首尾、边界和中间省略号', () => {
  assert.deepEqual(getPaginationPages(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPaginationPages(1, 20), [1, 2, 3, 4, 5, 6, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationPages(10, 20), [
    1,
    'ellipsis-start',
    8,
    9,
    10,
    11,
    12,
    'ellipsis-end',
    20,
  ]);
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
        assert.deepEqual(
          pages,
          [...new Set(pages)].sort((a, b) => a - b),
        );
        // 此组最大窗口为 9，最多再增加两侧的补齐页或省略号。
        assert(entries.length <= 9 + 2);
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

  for (const props of [
    { current: 10, totalPage: 10 },
    { current: 1, totalPage: 0 },
    { current: 1, totalPage: 1 },
    { current: 3, totalPage: 10, disabled: true },
  ]) {
    await render({ ...props, onChange: page => changes.push(page) });
    assert(item('下一页').disabled);
    await click(item('下一页'));

    if (props.totalPage <= 1) assert(item('上一页').disabled);

    if (props.disabled) {
      for (const button of container.querySelectorAll('button')) assert(button.disabled);
    }
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
  await render({
    current: 2,
    totalPage: 5,
    itemProps: { 3: { title: 'static', className: 'custom' } },
    getItemProps: (page, type) => {
      calls.push([page, type]);
      return page === 3 ? { title: type } : undefined;
    },
  });
  assert.equal(item('第 3 页').title, 'page');
  assert.equal(item('下一页').title, 'next');
  assert(item('第 3 页').classList.contains('custom'));
  assert(calls.some(([page, type]) => page === 1 && type === 'previous'));
});

test('逐项禁用与 preventDefault 阻止切页', async () => {
  const changes = [];
  let clicked = 0;
  await render({
    current: 1,
    totalPage: 5,
    onChange: page => changes.push(page),
    itemProps: {
      2: { disabled: true },
      3: {
        onClick: event => {
          clicked++;
          event.preventDefault();
        },
      },
    },
  });
  assert(item('第 2 页').disabled);
  assert(item('下一页').disabled);
  await click(item('第 2 页'));
  await click(item('第 3 页'));
  assert.equal(clicked, 1);
  assert.deepEqual(changes, []);
});

test('链接保留 href、target 与修饰键行为；普通点击触发受控通知', async () => {
  const changes = [];
  await render({
    current: 1,
    totalPage: 5,
    as: 'a',
    getItemProps: page => ({ href: `#page-${page}`, target: '_blank', rel: 'noreferrer' }),
    onChange: page => changes.push(page),
  });
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
  await render({
    current: 1,
    totalPage: 5,
    as: 'a',
    getItemProps: page => ({ href: `#page-${page}` }),
    onChange: page => changes.push(page),
  });
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
  const nav = await render({
    current: 1,
    totalPage: 5,
    ref,
    className: 'custom-pagination',
    size: { base: 'xs', md: 'lg' },
  });
  assert.equal(ref.current, nav);
  assert.equal(nav.getAttribute('aria-label'), '分页');
  assert(nav.classList.contains('custom-pagination'));
  const button = item('第 1 页');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('data-intent'), 'brand');
  assert.equal(
    button.style.getPropertyValue('--button-base-height'),
    'var(--button-size-xs-height)',
  );
  assert.equal(button.style.getPropertyValue('--button-md-height'), 'var(--button-size-lg-height)');
});

test('导出页码函数独立归一化异常输入并限制窗口内存', () => {
  assert.deepEqual(getPaginationPages(NaN, 20), getPaginationPages(1, 20));
  assert.deepEqual(getPaginationPages(99, 20), getPaginationPages(20, 20));
  assert.deepEqual(getPaginationPages(-5, 20), getPaginationPages(1, 20));
  assert.deepEqual(getPaginationPages(1, 5.9), [1, 2, 3, 4, 5]);

  for (const total of [NaN, Infinity, -1]) {
    assert.deepEqual(getPaginationPages(1, total), []);
  }

  assert.deepEqual(getPaginationPages(10, 20, 6), getPaginationPages(10, 20, 7));
  assert.deepEqual(getPaginationPages(10, 20, -1), getPaginationPages(10, 20, 5));

  for (const current of [1, 500_000_000, 1_000_000_000, Number.MAX_SAFE_INTEGER]) {
    const entries = getPaginationPages(current, Number.MAX_SAFE_INTEGER, 1e9);
    // 最大窗口 21，加两侧各一个省略号或补齐页。
    assert(entries.length <= 21 + 2);
    assert(entries.includes(current));
    assert(entries.every(entry => typeof entry !== 'number' || Number.isSafeInteger(entry)));
  }
});

test('空地址和纯空白地址回退按钮，普通点击和修饰键点击均不会导航', async () => {
  for (const href of [undefined, '', '   ']) {
    const changes = [];
    await render({
      current: 1,
      totalPage: 5,
      as: 'a',
      getItemProps: () => ({ href }),
      onChange: page => changes.push(page),
    });
    const button = item('第 2 页');
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.getAttribute('href'), null);
    assert.equal((await click(button)).defaultPrevented, true);
    assert.equal((await click(button, { ctrlKey: true })).defaultPrevented, true);
    assert.deepEqual(changes, [2, 2]);
  }
});

test('支持导航与逐项标签定制，显式 aria-label 优先', async () => {
  const nav = await render({
    current: 1,
    totalPage: 5,
    label: 'Search results pages',
    getItemAriaLabel: (page, type) => `${type} ${page}`,
    itemProps: { 3: { 'aria-label': 'Third page' } },
  });
  assert.equal(nav.getAttribute('aria-label'), 'Search results pages');
  assert(item('next 2'));
  assert(item('page 2'));
  assert(item('Third page'));
});

test('运行时过滤受管理属性，同时保留原生和 data 属性', async () => {
  let changes = 0;
  await render({
    current: 1,
    totalPage: 5,
    itemProps: {
      2: {
        children: 'wrong',
        dangerouslySetInnerHTML: { __html: 'wrong' },
        link: '#wrong',
        type: 'submit',
        'aria-current': 'page',
        size: '2xl',
        intent: 'brand',
        variant: 'fill',
        onChange: () => {
          changes++;
        },
        'data-custom': 'preserved',
      },
    },
  });
  const button = item('第 2 页');
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.textContent, '2');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('aria-current'), null);
  assert.equal(button.dataset.intent, 'normal');
  assert.equal(button.dataset.variant, 'ghost');
  assert.equal(button.dataset.custom, 'preserved');
  await act(() => button.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  assert.equal(changes, 0);
});

test('SSR 输出导航、活动页与箭头 SVG', () => {
  const markup = renderToString(h(Pagination, { current: 2, totalPage: 20 }));
  const document = new JSDOM(markup).window.document;
  assert.equal(document.querySelector('nav').getAttribute('aria-label'), '分页');
  assert.equal(document.querySelector('[aria-current="page"]').textContent, '2');
  assert.equal(document.querySelectorAll('svg').length, 2);
});

test('省略号七档尺寸与 Button token 保持一致，响应式只标记显式断点', async () => {
  const source = await readFile(new URL('../button/design.tokens.css', import.meta.url), 'utf8');
  const values = new Map();
  postcss.parse(source).walkDecls(declaration => values.set(declaration.prop, declaration.value));

  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    const style = getPaginationSizeStyle(size);
    assert.equal(style['--pagination-base-width'], values.get(`--button-size-${size}-height`));
    assert.equal(
      style['--pagination-base-font-size'],
      values.get(`--button-size-${size}-font-size`),
    );
  }

  const nav = await render({
    current: 10,
    totalPage: 20,
    size: { base: 'xs', lg: '2xl' },
  });
  assert(nav.querySelector('.bk-pagination__ellipsis'));
  assert(nav.hasAttribute('data-size-lg'));
  assert.equal(nav.hasAttribute('data-size-md'), false);
  assert.equal(nav.style.getPropertyValue('--pagination-base-width'), '28px');
  assert.equal(nav.style.getPropertyValue('--pagination-lg-width'), '56px');
});

test('Playground 点击更新当前页，Controls 修改 current 后同步', async () => {
  await render({ current: 1, totalPage: 5 });
  const props = { current: 1, totalPage: 5 };
  await act(() => root.render(h(Playground.render, props)));
  await click(item('下一页'));
  assert.equal(item('第 2 页').getAttribute('aria-current'), 'page');
  await act(() => root.render(h(Playground.render, { ...props, current: 4 })));
  assert.equal(item('第 4 页').getAttribute('aria-current'), 'page');
});
