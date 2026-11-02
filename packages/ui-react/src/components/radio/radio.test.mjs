import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';

let Radios, createRoot, dom, temporary, root, container, user, sizeBreakpointMinWidths;
let nextFrame = 0;
const frames = new Map();
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'https://example.test' });
  // 显式推进帧，以验证合帧行为与卸载清理；JSDOM 不计算真实布局。
  dom.window.requestAnimationFrame = callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  dom.window.cancelAnimationFrame = id => frames.delete(id);
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  dom.window.PointerEvent ??= dom.window.MouseEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { userEvent } = await import('storybook/test');
  user = userEvent.setup({ document });
  const output = fileURLToPath(new URL('../../../../../.test-output/', import.meta.url));
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(`${output}/radio-`);
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  await writeFile(`${temporary}/radio.mjs`, result.outputFiles[0].contents);
  ({ Radios } = await import(`${temporary}/radio.mjs`));
  const sizes = await build({
    entryPoints: [fileURLToPath(new URL('../utils/size.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'esm', write: false,
  });
  await writeFile(`${temporary}/size.mjs`, sizes.outputFiles[0].contents);
  ({ sizeBreakpointMinWidths } = await import(`${temporary}/size.mjs`));
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
  frames.clear();
});
after(async () => {
  dom?.window.close();
  for (const name of globals) delete globalThis[name];
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  if (temporary) await rm(temporary, { recursive: true, force: true });
});
const options = [{ label: '零', value: 0, other: '数字零' }, { label: '禁用', value: 1, disabled: true }, { label: '二', value: 2 }];
async function flushFrames() {
  await act(async () => { await Promise.resolve(); });
  for (let count = 0; frames.size; count++) {
    assert.ok(count < 20, '帧测量应收敛，不能因为滑块自身更新不断重新排帧');
    await act(async () => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(count * 16);
    });
  }
}
async function render(props = {}, wrap = child => child) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => { root.render(wrap(h(Radios, { options, 'aria-label': '数字', ...props }))); });
  await flushFrames();
  return [...container.querySelectorAll('[role="radio"]')];
}

test('数值零、点击文案、键盘跳过禁用项，保留标签和描述', async () => {
  const changes = [], ref = createRef();
  const radios = await render({ ref, defaultValue: 0, onChange: value => changes.push(value) });
  assert.equal(ref.current.getAttribute('role'), 'radiogroup');
  assert.equal(radios[0].getAttribute('aria-checked'), 'true');
  assert.equal(document.getElementById(radios[0].getAttribute('aria-labelledby')).textContent, '零');
  assert.equal(document.getElementById(radios[0].getAttribute('aria-describedby')).textContent, '数字零');
  await act(async () => { radios[0].focus(); await user.keyboard('{ArrowRight}'); });
  assert.equal(radios[2].getAttribute('aria-checked'), 'true');
  await act(() => radios[0].querySelector('.bkreact-radio__label').click());
  assert.deepEqual(changes, [2, 0]);
});

test('受控值等待回写，并支持取消非受控变化', async () => {
  const changes = [];
  let radios = await render({ value: 0, onChange: value => changes.push(value) });
  await act(() => radios[2].click());
  assert.deepEqual(changes, [2]);
  assert.equal(radios[0].getAttribute('aria-checked'), 'true');
  radios = await render({ value: 2 });
  assert.equal(radios[2].getAttribute('aria-checked'), 'true');
  await act(() => root.unmount());
  root = undefined;
  container.remove();
  radios = await render({ defaultValue: 0, onChange: (_, details) => details.cancel() });
  await act(() => radios[2].click());
  assert.equal(radios[0].getAttribute('aria-checked'), 'true');
});

test('禁用与只读阻止变化，表单提交原始值', async () => {
  const changes = [];
  for (const props of [{ disabled: true }, { readOnly: true }]) {
    const radios = await render({ defaultValue: 0, onChange: value => changes.push(value), ...props });
    await act(() => radios[2].click());
    assert.equal(radios[0].getAttribute('aria-checked'), 'true');
    assert.ok(radios.every(radio => radio.hasAttribute(props.readOnly ? 'data-readonly' : 'data-disabled')));
  }
  assert.deepEqual(changes, []);
  const radios = await render({ defaultValue: 0, name: 'number' }, child => h('form', null, child));
  const form = container.querySelector('form');
  await act(() => radios[2].click());
  assert.equal(new dom.window.FormData(form).get('number'), '2');
});

test('fill 共享滑块跟随实际选中项，外部值及窗口尺寸变化重新测量', async () => {
  const radios = await render({ variant: 'fill', value: 0 });
  const group = container.querySelector('[role="radiogroup"]');
  group.getBoundingClientRect = () => ({ left: 10, top: 20 });
  radios[0].getBoundingClientRect = () => ({ left: 14, top: 24, width: 80, height: 40 });
  radios[2].getBoundingClientRect = () => ({ left: 174, top: 24, width: 120, height: 40 });
  await act(() => window.dispatchEvent(new Event('resize')));
  await flushFrames();
  let slider = container.querySelector('.bkreact-radio__slider');
  assert.equal(slider.style.transform, 'translate(4px, 4px)');
  await render({ variant: 'fill', value: 2 });
  assert.equal(container.querySelector('.bkreact-radio__slider'), slider, '切换时保留同一滑块');
  assert.equal(slider.style.transform, 'translate(164px, 4px)');
  assert.equal(slider.style.width, '120px');
  await render({ variant: 'fill', value: 999 });
  assert.equal(container.querySelector('.bkreact-radio__slider'), null);
});

test('空描述不会生成无意义的描述引用，数字零仍是有效描述', async () => {
  const emptyValues = ['', '   ', false, true, null, undefined, [], ['', false]];
  for (const other of emptyValues) {
    const [radio] = await render({ options: [{ label: '选项', value: 0, other }] });
    assert.equal(radio.hasAttribute('aria-describedby'), false);
    assert.equal(radio.querySelector('.bkreact-radio__description'), null);
  }
  const [radio] = await render({ options: [{ label: '选项', value: 0, other: 0 }] });
  assert.equal(document.getElementById(radio.getAttribute('aria-describedby')).textContent, '0');
});

test('固定 size 在窄屏仍映射 base，且不生成断点属性', async () => {
  const previousWidth = window.innerWidth;
  window.innerWidth = 320;
  try {
    for (const size of ['sm', '2xs']) {
      await render({ size });
      const group = container.querySelector('[role="radiogroup"]');
      assert.equal(group.style.getPropertyValue('--radio-base-height'), `var(--radio-size-${size}-height)`);
      for (const breakpoint of Object.keys(sizeBreakpointMinWidths)) {
        assert.equal(group.hasAttribute(`data-size-${breakpoint}`), false);
      }
    }
    const tokens = postcss.parse(await readFile(new URL('./tokens.css', import.meta.url), 'utf8'));
    const height = tokens.nodes.find(node => node.selector === '.bkreact-radio').nodes.find(node => node.prop === '--radio-height');
    assert.equal(height.value, 'var(--radio-base-height)');
  } finally {
    window.innerWidth = previousWidth;
  }
});

test('响应式 CSS 的断点与共享 size 定义一致', async () => {
  const css = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  for (const [breakpoint, width] of Object.entries(sizeBreakpointMinWidths)) {
    const media = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === `(min-width: ${width}rem)`);
    const rule = media?.nodes.find(node => node.selector === `.bkreact-radio[data-size-${breakpoint}]`);
    assert.ok(rule, `缺失 ${breakpoint} 断点规则`);
    for (const declaration of rule.nodes) {
      assert.equal(declaration.value, `var(${declaration.prop.replace('--radio-', `--radio-${breakpoint}-`)})`);
    }
  }
});

test('callback / object ref 在更换及卸载时同步，支持 React 19 cleanup ref', async () => {
  const calls = [];
  const callback = node => calls.push(node);
  await render({ ref: callback });
  const group = container.querySelector('[role="radiogroup"]');
  assert.equal(calls.at(-1), group);
  const objectRef = createRef();
  await render({ ref: objectRef });
  assert.equal(calls.at(-1), null);
  assert.equal(objectRef.current, group);
  let cleaned = false;
  await render({ ref: node => {
    assert.equal(node, group);
    return () => { cleaned = true; };
  } });
  assert.equal(objectRef.current, null);
  await act(() => root.unmount());
  root = undefined;
  assert.equal(cleaned, true);
});

test('fill 空选项不显示滑块，round 仅标记 fill 的全圆角', async () => {
  for (const [variant, round, expected] of [['fill', true, true], ['fill', false, false], ['outline', true, false]]) {
    await render({ variant, round, options: [] });
    assert.equal(container.querySelector('[role="radiogroup"]').hasAttribute('data-round'), expected);
    assert.equal(container.querySelector('.bkreact-radio__slider'), null);
  }
});

test('fill observer 不随内联 options/size 重建，并追踪同数量的选项替换', async () => {
  const instances = [];
  globalThis.ResizeObserver = class {
    observed = new Set();
    disconnected = false;
    constructor(callback) { this.callback = callback; instances.push(this); }
    observe(node) { this.observed.add(node); }
    unobserve(node) { this.observed.delete(node); }
    disconnect() { this.disconnected = true; this.observed.clear(); }
  };
  try {
    const first = await render({ variant: 'fill', value: 0, options: [...options], size: { base: 'sm' } });
    await render({ variant: 'fill', value: 2, options: [...options], size: { base: 'base' } });
    assert.equal(instances.length, 1);
    const replacement = await render({ variant: 'fill', value: 4, options: [{ label: '三', value: 3 }, { label: '四', value: 4 }, { label: '五', value: 5 }] });
    assert.ok(first.every(node => !instances[0].observed.has(node)));
    assert.ok(replacement.every(node => instances[0].observed.has(node)));
    let measurements = 0;
    const group = container.querySelector('[role="radiogroup"]');
    group.getBoundingClientRect = () => { measurements++; return { left: 0, top: 0 }; };
    replacement[1].getBoundingClientRect = () => ({ left: 80, top: 4, width: 80, height: 32 });
    await act(async () => {
      for (let count = 0; count < 10; count++) {
        window.dispatchEvent(new Event('resize'));
        instances[0].callback();
      }
    });
    assert.equal(measurements, 0);
    await flushFrames();
    assert.equal(measurements, 1, '同一帧内多次触发只读取一次布局');
    assert.equal(container.querySelector('.bkreact-radio__slider').style.transform, 'translate(80px, 4px)');
    await act(() => window.dispatchEvent(new Event('resize')));
    const pendingFrames = new Set(frames.keys());
    assert.ok(pendingFrames.size > 0);
    await act(() => root.unmount());
    root = undefined;
    assert.ok(instances[0].disconnected);
    assert.ok([...pendingFrames].every(id => !frames.has(id)), '卸载取消待执行的测量');
  } finally {
    delete globalThis.ResizeObserver;
  }
});

test('动态选项保留字符串与数字区别、选中类名以及响应式尺寸', async () => {
  const radios = await render({
    options: [{ label: '数字', value: 0 }, { label: '字符串', value: '0', activeClassName: 'chosen' }],
    defaultValue: '0', variant: 'outline', size: { base: 'xs', md: 'lg' },
  });
  assert.equal(radios[0].getAttribute('aria-checked'), 'false');
  assert.equal(radios[1].getAttribute('aria-checked'), 'true');
  assert.ok(radios[1].classList.contains('chosen'));
  const group = container.querySelector('[role="radiogroup"]');
  assert.equal(group.style.getPropertyValue('--radio-md-height'), 'var(--radio-size-lg-height)');
  assert.equal(group.getAttribute('data-size-md'), 'true');
});
