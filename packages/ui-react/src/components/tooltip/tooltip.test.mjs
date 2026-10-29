import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let Tooltip, TooltipProvider, getTooltipSizeStyle, createRoot, dom, temporary, root, container;
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
  'MutationObserver',
  'getComputedStyle',
  'ShadowRoot',
  'requestAnimationFrame',
  'cancelAnimationFrame',
];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });

  for (const name of globals) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(document.documentElement, 'clientWidth', { value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: 768 });
  await mkdir(fileURLToPath(new URL('../../../../../.test-output/', import.meta.url)), {
    recursive: true,
  });
  temporary = await mkdtemp(
    fileURLToPath(new URL('../../../../../.test-output/tooltip-', import.meta.url)),
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
  const file = `${temporary}/tooltip.mjs`;
  await writeFile(file, result.outputFiles[0].contents);
  ({ Tooltip, TooltipProvider } = await import(file));
  const sizes = await build({
    entryPoints: [fileURLToPath(new URL('./size.ts', import.meta.url))],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    write: false,
  });
  await writeFile(`${temporary}/size.mjs`, sizes.outputFiles[0].contents);
  ({ getTooltipSizeStyle } = await import(`${temporary}/size.mjs`));
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

  if (temporary) await rm(temporary, { recursive: true, force: true });
});

async function render(props = {}, childProps = {}, providerProps = { delay: 0 }) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }

  await act(() =>
    root.render(
      h(
        TooltipProvider,
        providerProps,
        h(
          Tooltip,
          { content: '帮助说明', ...props },
          h('button', { type: 'button', ...childProps }, '帮助'),
        ),
      ),
    ),
  );

  return container.querySelector('button');
}

const popup = () => document.querySelector('.bkreact-tooltip');

test('键盘焦点打开、Escape 关闭并保持焦点，不增加触发器包装', async () => {
  const trigger = await render();
  assert.equal(container.children.length, 1);
  assert.equal(popup(), null);
  await act(() => trigger.focus());
  assert.equal(popup()?.textContent, '帮助说明');
  assert(!container.contains(popup()));
  await act(() =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  );
  assert.equal(popup(), null);
  assert.equal(document.activeElement, trigger);
});

test('受控开关通知调用方并等待回写，浮层 ref 与属性透传', async () => {
  const ref = createRef(),
    changes = [];
  const trigger = await render({
    open: false,
    ref,
    onOpenChange: value => changes.push(value),
    className: 'custom',
    id: 'help-popup',
  });
  await act(() => trigger.focus());
  assert.deepEqual(changes, [true]);
  assert.equal(popup(), null);
  await render({
    open: true,
    ref,
    className: 'custom',
    id: 'help-popup',
    size: { base: 'xs', md: 'lg' },
    arrow: false,
  });
  assert.equal(ref.current, popup());
  assert(popup().classList.contains('custom'));
  assert.equal(popup().id, 'help-popup');
  assert.equal(popup().getAttribute('data-size-md'), 'true');
  assert.equal(
    popup().style.getPropertyValue('--tooltip-md-font-size'),
    'var(--tooltip-size-lg-font-size)',
  );
  assert.equal(popup().querySelector('.bkreact-tooltip__arrow'), null);
  await render({ open: false, ref });
  assert.equal(popup(), null);
  assert.equal(ref.current, null);
});

test('disabled 仅禁用提示，保留触发元素点击与 ref', async () => {
  const triggerRef = createRef();
  let clicks = 0,
    focuses = 0;
  const trigger = await render(
    { disabled: true, triggerProps: { onFocus: () => focuses++ } },
    { ref: triggerRef, onClick: () => clicks++ },
  );
  await act(() => trigger.focus());
  await act(() => trigger.click());
  assert.equal(popup(), null);
  assert.equal(triggerRef.current, trigger);
  assert.equal(trigger.disabled, false);
  assert.equal(clicks, 1);
  assert.equal(focuses, 1);
});

test('非受控默认打开并在点击触发元素后关闭', async () => {
  const trigger = await render({ defaultOpen: true });
  assert.equal(popup()?.textContent, '帮助说明');
  assert(popup().querySelector('.bkreact-tooltip__arrow'));
  await act(() => trigger.click());
  assert.equal(popup(), null);
});

test('悬停使用 Provider 延时，离开后关闭并合并触发器事件', async () => {
  let enters = 0;
  const trigger = await render({ triggerProps: { onMouseEnter: () => enters++ } });
  await act(async () => {
    const pointer = new Event('pointerover', { bubbles: true });
    Object.defineProperty(pointer, 'pointerType', { value: 'mouse' });
    trigger.dispatchEvent(pointer);
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    trigger.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  assert.equal(enters, 1);
  assert.equal(popup()?.textContent, '帮助说明');
  await act(async () => {
    trigger.dispatchEvent(
      new MouseEvent('mouseleave', { relatedTarget: document.body, clientX: 100, clientY: 100 }),
    );
    trigger.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    );
    document.body.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  assert.equal(popup(), null);
});

test('单值尺寸始终映射 base；响应式尺寸缺少 base 明确报错', async () => {
  const trigger = await render({ size: 'lg' });
  await act(() => trigger.focus());

  for (const dimension of ['padding-x', 'padding-y', 'font-size', 'line-height']) {
    assert.equal(
      popup().style.getPropertyValue(`--tooltip-base-${dimension}`),
      `var(--tooltip-size-lg-${dimension})`,
    );
  }

  assert.equal(popup().hasAttribute('data-size'), false);
  assert.throws(() => getTooltipSizeStyle({ md: 'lg' }), /必须显式提供 base/);
  assert.throws(() => getTooltipSizeStyle('missing'), /未知尺寸/);
});

function enter(trigger) {
  const pointer = new Event('pointerover', { bubbles: true });
  Object.defineProperty(pointer, 'pointerType', { value: 'mouse' });
  trigger.dispatchEvent(pointer);
  trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  trigger.dispatchEvent(new MouseEvent('mouseenter'));
  trigger.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
}

function leave(trigger) {
  trigger.dispatchEvent(
    new MouseEvent('mouseleave', { relatedTarget: document.body, clientX: 900, clientY: 700 }),
  );
  trigger.dispatchEvent(
    new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
  );
  document.body.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: 900, clientY: 700 }),
  );
}

test('Provider 的 200ms 打开与关闭延时生效，组件可单独覆盖', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const providerProps = { delay: 200, closeDelay: 120 };
  const trigger = await render({ disableHoverablePopup: true }, {}, providerProps);
  await act(() => enter(trigger));
  await act(() => t.mock.timers.tick(199));
  assert.equal(popup(), null);
  await act(() => t.mock.timers.tick(1));
  assert(popup());
  await act(() => leave(trigger));
  await act(() => t.mock.timers.tick(119));
  assert(popup());
  await act(() => t.mock.timers.tick(1));
  assert.equal(popup(), null);

  await render({ delay: 0, closeDelay: 0, disableHoverablePopup: true }, {}, providerProps);
  await act(() => enter(trigger));
  await act(() => t.mock.timers.tick(0));
  assert(popup());
  await act(() => leave(trigger));
  await act(() => t.mock.timers.tick(0));
  assert.equal(popup(), null);
});

test('方向、对齐和显式间距透传；无箭头默认间距为 4', async () => {
  const trigger = await render({ side: 'bottom', align: 'start', arrow: false, sideOffset: 17 });
  trigger.getBoundingClientRect = () => ({
    x: 300,
    y: 300,
    left: 300,
    top: 300,
    right: 400,
    bottom: 330,
    width: 100,
    height: 30,
  });
  await act(() => trigger.focus());

  const positioner = () => document.querySelector('.bkreact-tooltip-positioner');

  const y = () => Number(positioner().style.transform.match(/translate\([^,]+, ([\d.-]+)px\)/)[1]);

  assert.equal(positioner().dataset.side, 'bottom');
  assert.equal(positioner().dataset.align, 'start');
  assert.equal(y(), 347);
  await render({ side: 'bottom', align: 'start', arrow: false });
  assert.equal(y(), 334);
  await render({ side: 'bottom', align: 'start', arrow: true });
  assert.equal(y(), 338);
});

test('Base UI 控制提示层鼠标命中，关闭悬停能力时设置 pointer-events: none', async () => {
  await render({ open: true });

  const positioner = () => document.querySelector('.bkreact-tooltip-positioner');

  assert.notEqual(positioner().style.pointerEvents, 'none');
  await render({ open: true, disableHoverablePopup: true });
  assert.equal(positioner().style.pointerEvents, 'none');
});

test('完成回调在打开和关闭后触发', async () => {
  const completed = [];
  const trigger = await render({ onOpenChangeComplete: open => completed.push(open) });
  await act(() => trigger.focus());
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 60));
  });
  assert.deepEqual(completed, [true]);
  await act(() =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  );
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 60));
  });
  assert.deepEqual(completed, [true, false]);
});
