import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let InputOTP, createRoot, userEvent, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'];
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

test('默认六位、ref、响应式尺寸及 Base UI className/style 回调', async () => {
  const ref = createRef();
  const inputs = await render({ ref, id: 'code', defaultValue: '12', size: { base: 'sm', md: 'lg' }, className: state => state.complete ? 'complete' : 'incomplete', style: state => ({ marginTop: state.complete ? 0 : 7, '--input-otp-gap': '13px' }) });
  assert.equal(inputs.length, 6);
  assert.equal(inputs[0].id, 'code');
  assert.equal(inputs[0].autocomplete, 'one-time-code');
  assert.deepEqual(inputs.map(input => input.value), ['1', '2', '', '', '', '']);
  assert.equal(ref.current, container.querySelector('.bkreact-input-otp'));
  assert(ref.current.classList.contains('incomplete'));
  assert(ref.current.hasAttribute('data-size-md'));
  assert.equal(ref.current.style.getPropertyValue('--input-otp-base-slot-size'), 'var(--input-otp-size-sm-slot-size)');
  assert.equal(ref.current.style.getPropertyValue('--input-otp-md-slot-size'), 'var(--input-otp-size-lg-slot-size)');
  assert.equal(ref.current.style.getPropertyValue('--input-otp-gap'), '13px');
  assert.equal(ref.current.style.marginTop, '7px');
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
