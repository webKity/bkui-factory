import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let InputOTP, createRoot, userEvent, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLDivElement', 'HTMLSpanElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  ({ userEvent } = await import('storybook/test'));
  temporary = await mkdtemp(new URL('../../../../../.test-output/otp-', import.meta.url));
  const output = await build({ entryPoints: [new URL('./index.tsx', import.meta.url).pathname], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  const file = `${temporary}/otp.mjs`;
  await writeFile(file, output.outputFiles[0].contents);
  ({ InputOTP } = await import(file));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});
after(async () => {
  dom?.window.close();
  for (const key of globals) delete globalThis[key];
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
  await act(() => root.render(h(InputOTP, props)));
  return [...container.querySelectorAll('.bkreact-input-otp__input')];
}

test('默认六位、ref、响应式尺寸及 Base UI className 回调，忽略外部 style', async () => {
  const ref = createRef();
  const inputs = await render({ ref, id: 'code', defaultValue: '12', size: { base: 'sm', md: 'lg' }, className: state => state.complete ? 'complete' : 'incomplete', style: state => ({ marginTop: state.complete ? 0 : 7, '--input-otp-gap': '13px' }) });
  assert.equal(inputs.length, 6);
  assert.equal(inputs[0].id, 'code');
  assert.equal(inputs[0].autocomplete, 'one-time-code');
  assert.deepEqual(inputs.map(input => input.value), ['1', '2', '', '', '', '']);
  assert.equal(ref.current, container.querySelector('.bkreact-input-otp'));
  assert(ref.current instanceof HTMLDivElement);
  assert(ref.current.classList.contains('incomplete'));
  assert(ref.current.hasAttribute('data-size-md'));
  for (const dimension of ['slot-size', 'font-size', 'line-height', 'gap']) {
    assert.equal(ref.current.style.getPropertyValue(`--input-otp-base-${dimension}`), `var(--input-otp-size-sm-${dimension})`);
    assert.equal(ref.current.style.getPropertyValue(`--input-otp-md-${dimension}`), `var(--input-otp-size-lg-${dimension})`);
  }
  assert.equal(ref.current.style.getPropertyValue('--input-otp-gap'), '');
  assert.equal(ref.current.style.marginTop, '');
});

test('非法 length 回退为六位并发出开发期诊断，后续仍能更新为合法位数', async t => {
  const error = t.mock.method(console, 'error', () => {});
  for (const length of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
    const inputs = await render({ length, value: '12345678' });
    assert.equal(inputs.length, 6);
    assert.deepEqual(inputs.map(input => input.value), ['1', '2', '3', '4', '5', '6']);
  }
  assert.equal(error.mock.callCount(), 7);
  assert(error.mock.calls.every(call => /length.*回退为 6/.test(call.arguments[0])));
  const inputs = await render({ length: 6, value: '654321' });
  assert.equal(inputs.length, 6);
  assert.deepEqual(inputs.map(input => input.value), ['6', '5', '4', '3', '2', '1']);
  assert.equal(error.mock.callCount(), 7);
});

test('type 优先于 mask，未传 type 时 mask 生效', async () => {
  for (const [props, expected] of [
    [{ type: 'text', mask: true }, 'text'],
    [{ type: 'password', mask: false }, 'password'],
    [{ mask: true }, 'password'],
    [{ mask: false }, 'text'],
    [{}, 'text'],
  ]) {
    const inputs = await render(props);
    assert(inputs.every(input => input.type === expected));
  }
});

test('字符串 size、className 和无障碍属性透传', async () => {
  const ref = createRef();
  await render({ ref, size: 'lg', className: 'custom', 'aria-label': '验证码' });
  assert(ref.current.classList.contains('custom'));
  assert.equal(ref.current.dataset.size, 'lg');
  assert.equal(ref.current.style.getPropertyValue('--input-otp-base-slot-size'), 'var(--input-otp-size-lg-slot-size)');
  assert.equal(ref.current.getAttribute('aria-label'), '验证码');
});

test('受控输入触发 onValueChange，但值由外部 value 决定', async () => {
  const changes = [];
  const inputs = await render({ value: '12', onValueChange: value => changes.push(value) });
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(inputs[2]); await user.keyboard('3'); });
  assert.equal(changes.at(-1), '123');
  assert.deepEqual(inputs.map(input => input.value), ['1', '2', '', '', '', '']);
});

test('输入、自动聚焦、方向键、退格、粘贴、完成回调及表单值', async () => {
  const changes = [], completions = [];
  const inputs = await render({ length: 4, name: 'otp', onValueChange: value => changes.push(value), onValueComplete: value => completions.push(value) });
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(inputs[0]); await user.keyboard('12'); });
  assert.equal(changes.at(-1), '12');
  assert.equal(document.activeElement, inputs[2]);
  await act(async () => { await user.keyboard('{ArrowLeft}{Backspace}'); });
  assert.equal(changes.at(-1), '1');
  await act(async () => { await user.click(inputs[0]); await user.paste('9876'); });
  assert.deepEqual(inputs.map(input => input.value), ['9', '8', '7', '6']);
  assert.equal(changes.at(-1), '9876');
  assert.equal(completions.at(-1), '9876');
  assert.equal(container.querySelector('input[name="otp"]').value, '9876');
});

test('受控值更新、password / mask、禁用及只读', async () => {
  let inputs = await render({ length: 4, value: '1234', type: 'password' });
  assert(inputs.every(input => input.type === 'password'));
  inputs = await render({ length: 4, value: '5678', type: 'text', mask: true, readOnly: true });
  assert.deepEqual(inputs.map(input => input.value), ['5', '6', '7', '8']);
  assert(inputs.every(input => input.type === 'text' && input.readOnly));
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(inputs[0]); await user.keyboard('9'); });
  assert.equal(inputs[0].value, '5');
  inputs = await render({ length: 4, value: '5678', disabled: true, mask: true });
  assert(inputs.every(input => input.disabled && input.type === 'password'));
});
