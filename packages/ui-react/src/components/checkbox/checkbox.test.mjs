import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';

let Checkbox, createRoot, dom, temporary, root, container, user, sizeBreakpointMinWidths;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  // JSDOM 26 缺少 PointerEvent；Base UI 通过它转发鼠标修饰键。
  dom.window.PointerEvent ??= dom.window.MouseEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { userEvent } = await import('storybook/test');
  user = userEvent.setup({ document });
  await mkdir(fileURLToPath(new URL('../../../../../.test-output/', import.meta.url)), { recursive: true });
  temporary = await mkdtemp(fileURLToPath(new URL('../../../../../.test-output/checkbox-', import.meta.url)));
  const result = await build({ entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  await writeFile(`${temporary}/checkbox.mjs`, result.outputFiles[0].contents);
  ({ Checkbox } = await import(`${temporary}/checkbox.mjs`));
  const sizes = await build({ entryPoints: [fileURLToPath(new URL('../utils/size.ts', import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false });
  await writeFile(`${temporary}/size.mjs`, sizes.outputFiles[0].contents);
  ({ sizeBreakpointMinWidths } = await import(`${temporary}/size.mjs`));
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
async function render(props = {}, wrap = child => child) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(wrap(h(Checkbox, props, 'children' in props ? props.children : '选择项目'))));
  return container.querySelector('[role="checkbox"]');
}

test('点击文案及 Space 切换非受控状态，ref 与 inputRef 指向对应元素', async () => {
  const changes = [], ref = createRef(), inputRef = createRef();
  const checkbox = await render({ ref, inputRef, onChange: (value, details) => changes.push([value, details]) });
  assert.equal(ref.current, checkbox);
  assert.equal(checkbox.tagName, 'SPAN', '默认根节点为 span，不能假定是原生 button');
  assert.equal(inputRef.current.type, 'checkbox');
  assert.equal(checkbox.getAttribute('aria-checked'), 'false');
  await act(() => checkbox.querySelector('.bkreact-checkbox__label').click());
  assert.equal(checkbox.getAttribute('aria-checked'), 'true');
  assert.equal(inputRef.current.checked, true);
  await act(async () => { checkbox.focus(); await user.keyboard('[Space]'); });
  assert.equal(checkbox.getAttribute('aria-checked'), 'false');
  assert.deepEqual(changes.map(([value]) => value), [true, false]);
  assert.equal(typeof changes[0][1].cancel, 'function');
});

test('受控状态等待回写，事件可取消非受控变化', async () => {
  const changes = [];
  let checkbox = await render({ checked: false, onChange: next => changes.push(next) });
  await act(() => checkbox.click());
  assert.deepEqual(changes, [true]);
  assert.equal(checkbox.getAttribute('aria-checked'), 'false');
  checkbox = await render({ checked: true });
  assert.equal(checkbox.getAttribute('aria-checked'), 'true');
  await act(() => root.unmount()); root = undefined; container.remove();
  checkbox = await render({ onChange: (_, details) => details.cancel() });
  await act(() => checkbox.click());
  assert.equal(checkbox.getAttribute('aria-checked'), 'false');
});

test('半选公开 mixed 语义并同步表单 input', async () => {
  const inputRef = createRef(), changes = [];
  const checkbox = await render({ indeterminate: true, inputRef, onChange: next => changes.push(next) });
  assert.equal(checkbox.getAttribute('aria-checked'), 'mixed');
  assert(checkbox.hasAttribute('data-indeterminate'));
  assert.equal(inputRef.current.indeterminate, true);
  await act(() => checkbox.click());
  assert.deepEqual(changes, [true]);
  await render({ indeterminate: false, inputRef });
  assert.equal(checkbox.getAttribute('aria-checked'), 'true');
  assert.equal(inputRef.current.indeterminate, false);
});

for (const state of ['disabled', 'readOnly']) {
  test(`${state} 阻止鼠标及键盘修改`, async () => {
    let changes = 0;
    const checkbox = await render({ [state]: true, defaultChecked: true, onChange: () => changes++ });
    await act(async () => { checkbox.click(); checkbox.focus(); await user.keyboard('[Space]'); });
    assert.equal(changes, 0);
    assert.equal(checkbox.getAttribute('aria-checked'), 'true');
    assert(checkbox.hasAttribute(state === 'disabled' ? 'data-disabled' : 'data-readonly'));
  });
}

test('原生表单提交、required 和禁用字段排除', async () => {
  const wrap = child => h('form', {}, child);
  let checkbox = await render({ name: 'agreement', value: 'accepted', required: true }, wrap);
  const form = container.querySelector('form');
  assert.equal(form.checkValidity(), false);
  assert.equal(new dom.window.FormData(form).has('agreement'), false);
  await act(() => checkbox.click());
  assert.equal(form.checkValidity(), true);
  assert.equal(new dom.window.FormData(form).get('agreement'), 'accepted');
  checkbox = await render({ name: 'agreement', value: 'accepted', disabled: true }, wrap);
  assert.equal(new dom.window.FormData(form).has('agreement'), false);
});

test('尺寸、稀疏断点及 Base UI className/style 状态回调', async () => {
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    const checkbox = await render({ size, 'aria-label': '选择', className: () => 'custom', style: state => ({ opacity: state.checked ? 0.8 : 1 }) });
    assert(checkbox.classList.contains('custom'));
    assert.equal(checkbox.dataset.size, size);
    assert.equal(checkbox.style.getPropertyValue('--checkbox-base-box-size'), `var(--checkbox-size-${size}-box-size)`);
    assert.equal(checkbox.getAttribute('aria-label'), '选择');
  }
  const checkbox = await render({ size: { base: 'xs', lg: 'xl' } });
  assert.equal(checkbox.dataset.size, 'responsive');
  assert(checkbox.hasAttribute('data-size-lg'));
  assert(!checkbox.hasAttribute('data-size-md'));
  assert.equal(checkbox.style.getPropertyValue('--checkbox-lg-box-size'), 'var(--checkbox-size-xl-box-size)');
});

test('styles 仅引用局部 tokens，主题语义存在，断点与 Button 一致', async () => {
  const read = file => readFile(new URL(file, import.meta.url), 'utf8');
  const styles = postcss.parse(await read('./styles.css'));
  styles.walkDecls(d => {
    for (const [, name] of d.value.matchAll(/var\((--[\w-]+)/g)) assert(name.startsWith('--checkbox-'));
  });
  const widths = [];
  styles.walkAtRules('media', rule => { if (rule.params.includes('min-width')) widths.push(rule.params); });
  assert.deepEqual(widths, Object.values(sizeBreakpointMinWidths).map(width => `(min-width: ${width}rem)`));
  for (const [scope, width] of Object.entries(sizeBreakpointMinWidths)) {
    const media = styles.nodes.find(node => node.type === 'atrule' && node.params === `(min-width: ${width}rem)`);
    const rule = media.nodes.find(node => node.selector === `.bkreact-checkbox[data-size-${scope}]`);
    assert(rule, `缺少 ${scope} 断点规则`);
    for (const dimension of ['box-size', 'icon-size', 'font-size', 'line-height', 'gap']) {
      assert(rule.nodes.some(node => node.prop === `--checkbox-${dimension}` && node.value === `var(--checkbox-${scope}-${dimension})`));
    }
  }
  const design = postcss.parse(await read('./design.tokens.css'));
  for (const theme of ['light', 'dark']) {
    const semantic = await read(`../themes/${theme}/semantic/colors.css`);
    design.walkDecls(d => {
      for (const [, name] of d.value.matchAll(/var\((--color-[\w-]+)/g)) assert(semantic.includes(`${name}:`), `${theme}: ${name}`);
    });
  }
});


test('无文案和无名称时开发期警告，有名称或生产环境时不警告', async t => {
  const warn = t.mock.method(console, 'warn', () => {});
  for (const children of [undefined, null, false, '', '   ']) {
    await render({ children });
    assert.equal(container.querySelector('.bkreact-checkbox__label')?.textContent ?? '', typeof children === 'string' ? children : '');
  }
  assert.equal(warn.mock.callCount(), 5);
  assert(warn.mock.calls.every(call => call.arguments[0] === '[Checkbox] 无文案时必须提供 aria-label 或 aria-labelledby'));
  await render({ children: null, 'aria-label': '选择当前行' });
  await render({ children: null, 'aria-labelledby': 'external-label' });
  await render({ children: '选择项目' });
  assert.equal(warn.mock.callCount(), 5);
  // Base UI 含开发期条件 Hook，切换环境前先卸载，避免跨环境复用实例。
  await act(() => root.unmount());
  root = undefined;
  container.remove();
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    await render({ children: null });
    assert.equal(warn.mock.callCount(), 5);
  } finally {
    if (root) await act(() => root.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('JS 的 onCheckedChange 可用作兜底，onChange 优先且只通知一次', async () => {
  const legacy = [], changes = [];
  const onCheckedChange = next => legacy.push(next);
  const checkbox = await render({ onCheckedChange });
  await act(() => checkbox.click());
  assert.deepEqual(legacy, [true]);
  await render({ onCheckedChange, onChange: next => changes.push(next) });
  await act(() => checkbox.click());
  assert.deepEqual(legacy, [true]);
  assert.deepEqual(changes, [false]);
});

test('只读已选字段继续提交值，半选字段仅在 checked 时提交', async () => {
  const wrap = child => h('form', {}, child), inputRef = createRef();
  const submitted = () => new dom.window.FormData(container.querySelector('form')).get('option');
  await render({ name: 'option', value: 'selected', checked: true, readOnly: true, inputRef }, wrap);
  assert.equal(inputRef.current.disabled, false);
  assert.equal(submitted(), 'selected');
  for (const checked of [false, true]) {
    const checkbox = await render({ name: 'option', value: 'selected', checked, indeterminate: true, inputRef }, wrap);
    assert.equal(checkbox.getAttribute('aria-checked'), 'mixed');
    assert.equal(inputRef.current.indeterminate, true);
    assert.equal(inputRef.current.checked, checked);
    assert.equal(submitted(), checked ? 'selected' : null);
  }
});

test('className/style 状态回调同步收到 checked 和 disabled', async () => {
  let classState, styleState;
  const props = {
    className: state => { classState = state; return state.checked ? 'selected' : 'unselected'; },
    style: state => { styleState = state; return { opacity: state.disabled ? 0.5 : state.checked ? 0.8 : 1 }; },
  };
  const verify = (checkbox, checked, disabled) => {
    for (const state of [classState, styleState]) {
      assert.equal(state.checked, checked);
      assert.equal(state.disabled, disabled);
    }
    assert(checkbox.classList.contains(checked ? 'selected' : 'unselected'));
    assert.equal(checkbox.style.opacity, String(disabled ? 0.5 : checked ? 0.8 : 1));
    assert.equal(checkbox.style.getPropertyValue('--checkbox-base-box-size'), 'var(--checkbox-size-base-box-size)');
  };
  const checkbox = await render(props);
  verify(checkbox, false, false);
  await act(() => checkbox.click());
  verify(checkbox, true, false);
  await render({ ...props, disabled: true });
  verify(checkbox, true, true);
});

test('disabled 默认根节点退出 Tab 顺序，但保持 Base UI 的程序化 focus 行为', async () => {
  const wrap = child => h('div', {}, h('button', { id: 'before' }, '之前'), child, h('button', { id: 'after' }, '之后'));
  const checkbox = await render({ disabled: true }, wrap);
  assert.equal(checkbox.getAttribute('aria-disabled'), 'true');
  assert.equal(checkbox.tabIndex, -1);
  await act(async () => { container.querySelector('#before').focus(); await user.tab(); });
  assert.equal(document.activeElement, container.querySelector('#after'));
  // 默认是 span[tabindex=-1]，其 focus() 仍有效，区别于原生 disabled button。
  await act(() => checkbox.focus());
  assert.equal(document.activeElement, checkbox);
});

test('图标与容器布局 tokens 独立，未选中默认继承文字颜色', async () => {
  const tokens = postcss.parse(await readFile(new URL('./tokens.css', import.meta.url), 'utf8'));
  const base = tokens.nodes.find(node => node.selector === '.bkreact-checkbox');
  const declarations = Object.fromEntries(base.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(declarations['--checkbox-icon-display'], 'block');
  assert.equal(declarations['--checkbox-box-color'], 'currentColor');
  const selected = tokens.nodes.find(node => node.selector?.includes(':where([data-checked]'));
  assert(selected.nodes.some(node => node.prop === '--checkbox-box-color' && node.value === 'var(--checkbox-selected-color)'));
  const styles = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const displayFor = selector => styles.nodes.find(node => node.selector === selector).nodes.find(node => node.prop === 'display').value;
  assert.equal(displayFor('.bkreact-checkbox__box'), 'var(--checkbox-box-display)');
  assert.equal(displayFor('.bkreact-checkbox__indicator'), 'var(--checkbox-indicator-display)');
  const visibleIcon = styles.nodes.find(node => node.selector?.startsWith('.bkreact-checkbox[data-checked]'));
  assert(visibleIcon.nodes.some(node => node.prop === 'display' && node.value === 'var(--checkbox-icon-display)'));
});
