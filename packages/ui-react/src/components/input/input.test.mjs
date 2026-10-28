import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let components, numberUtils, createRoot, userEvent, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLDivElement', 'HTMLSpanElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  ({ userEvent } = await import('storybook/test'));
  temporary = await mkdtemp(new URL('../../../../../.test-output/input-', import.meta.url));
  const output = await build({ entryPoints: [new URL('./index.tsx', import.meta.url).pathname], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  const file = `${temporary}/input.mjs`;
  await writeFile(file, output.outputFiles[0].contents);
  components = await import(file);
  const numericOutput = await build({ entryPoints: [new URL('./number.ts', import.meta.url).pathname], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false });
  const numericFile = `${temporary}/number.mjs`;
  await writeFile(numericFile, numericOutput.outputFiles[0].contents);
  numberUtils = await import(numericFile);
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
async function render(props = {}, content) {
  if (!container) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(content ?? h(components.Input, props)));
  return container.querySelector('input');
}

test('原生属性、ref、响应式尺寸与清除回调', async () => {
  const ref = createRef(), changes = [];
  const input = await render({ ref, defaultValue: 'abc', clearable: true, name: 'query', size: { base: 'sm', md: 'lg' }, onChange: e => changes.push(e.target.value) });
  assert.equal(ref.current, input);
  assert.equal(input.name, 'query');
  assert(container.firstChild.hasAttribute('data-size-md'));
  assert.equal(container.firstChild.style.getPropertyValue('--input-md-height'), 'var(--input-size-lg-height)');
  await act(async () => { await userEvent.setup({ document }).click(container.querySelector('button')); });
  assert.equal(input.value, '');
  assert.deepEqual(changes, ['']);
  assert.equal(container.querySelector('button'), null);
});

test('受控值保持外部所有权，清除和数字步进只通知 onChange', async () => {
  const changes = [];
  const input = await render({ value: '1', type: 'number', clearable: true, showNumberStepper: true, onChange: e => changes.push(e.target.value) });
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(container.querySelector('[aria-label="Increase value"]')); });
  assert.equal(changes.at(-1), '2');
  assert.equal(input.value, '1');
  await act(async () => { await user.click(container.querySelector('[aria-label="Clear input"]')); });
  assert.equal(changes.at(-1), '');
  assert.equal(input.value, '1');
  await render({ value: '8', type: 'number' });
  assert.equal(input.value, '8');
});

test('密码显隐、禁用和只读', async () => {
  const user = userEvent.setup({ document });
  let input = await render({ type: 'password', defaultValue: 'secret' });
  await act(async () => { await user.click(container.querySelector('button')); });
  assert.equal(input.type, 'text');
  assert.equal(input.value, 'secret');
  await render({ type: 'password', disabled: true });
  assert(container.querySelector('button').disabled);
  input = await render({ type: 'number', value: '7', readOnly: true, clearable: true, showNumberStepper: true });
  assert.equal(container.querySelector('button'), null);
  await act(async () => { await user.click(input); await user.keyboard('{ArrowUp}8'); });
  assert.equal(input.value, '7');
});

test('数字过滤、精度、全角粘贴、失焦与普通文本保真', async () => {
  const changes = [];
  const input = await render({ type: 'number', decimal: 2, onChange: e => changes.push(e.target.value) });
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(input); await user.keyboard('.a-1.234'); });
  assert.equal(input.value, '1.23');
  await act(async () => { await user.clear(input); await user.paste('１２。３４'); });
  assert.equal(input.value, '12.34');
  assert.equal(changes.at(-1), '12.34');
  await act(async () => { await user.clear(input); await user.keyboard('1.'); await user.tab(); });
  assert.equal(input.value, '1');
  await render({ type: 'text' });
  await act(async () => { await user.clear(input); await user.type(input, '１２。３４'); });
  assert.equal(input.value, '１２。３４');
});

test('十进制步进、边界、校验器和方向键', async () => {
  const input = await render({ type: 'number', defaultValue: '0.1', step: '0.1', max: '0.3', decimal: 2, showNumberStepper: true });
  const user = userEvent.setup({ document });
  const up = container.querySelector('[aria-label="Increase value"]');
  await act(async () => { await user.click(up); });
  assert.equal(input.value, '0.2');
  await act(async () => { await user.click(up); });
  assert.equal(input.value, '0.3');
  assert(up.disabled);
  await act(async () => { await user.click(input); await user.keyboard('{ArrowDown}'); });
  assert.equal(input.value, '0.2');
  await render({ type: 'number', value: '0.2', step: '0.1', showNumberStepper: true, stepValidator: ({ direction }) => direction !== 'up' });
  assert(up.disabled);
  await render({ type: 'number', value: '0.2', step: '0', showNumberStepper: true });
  assert([...container.querySelectorAll('button')].every(button => button.disabled));
});

test('组合继承、附加区域排列、点击聚焦、阻止默认与交互元素保护', async () => {
  const { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } = components;
  const ref = createRef();
  await render({}, h(InputGroup, { intent: 'danger', variant: 'fill', size: { base: 'xs', md: 'lg' } },
    h(InputGroupAddon, { align: 'inline-end' }, h(InputGroupText, {}, 'USDT')),
    h(InputGroupInput, { ref }), h(InputGroupAddon, { align: 'block-end' }, h('button', {}, 'Action'))));
  const input = ref.current, wrapper = input.parentElement;
  assert.equal(wrapper.dataset.intent, 'danger');
  assert.equal(wrapper.dataset.variant, 'fill');
  assert(wrapper.hasAttribute('data-grouped'));
  assert(wrapper.hasAttribute('data-size-md'));
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(container.querySelector('span')); });
  assert.equal(document.activeElement, input);
  await act(async () => { await user.click(container.querySelector('button')); });
  assert.equal(document.activeElement, container.querySelector('button'));
  await render({}, h(InputGroup, { onClick: event => event.preventDefault() }, h(InputGroupInput), h(InputGroupAddon, {}, 'label')));
  await act(async () => { await user.click(container.querySelector('[data-slot="input-group-addon"]')); });
  assert.notEqual(document.activeElement, container.querySelector('input'));
});

test('Textarea 保留原生 props、ref 和显式外观覆盖', async () => {
  const ref = createRef();
  await render({}, h(components.InputGroup, { intent: 'danger', size: 'lg' }, h(components.InputGroupTextarea, { ref, rows: 4, defaultValue: 'hello', intent: 'brand', variant: 'fill' })));
  assert.equal(ref.current.tagName, 'TEXTAREA');
  assert.equal(ref.current.value, 'hello');
  assert.equal(ref.current.rows, 4);
  assert.equal(ref.current.dataset.intent, 'brand');
  assert.equal(ref.current.dataset.size, 'lg');
  assert(ref.current.hasAttribute('data-grouped'));
  assert.equal(ref.current.dataset.slot, 'textarea');
});

test('受控数字保留小数草稿并在失焦时通知最终值', async () => {
  const changes = [];
  function Controlled() {
    const [value, setValue] = React.useState('');
    return h(components.Input, { type: 'number', value, onChange: event => { changes.push(event.target.value); setValue(event.target.value); } });
  }
  const React = await import('react');
  const input = await render({}, h(Controlled));
  const user = userEvent.setup({ document });
  await act(async () => { await user.type(input, '1.'); });
  assert.equal(input.value, '1.');
  await act(async () => { await user.tab(); });
  assert.equal(input.value, '1');
  assert.deepEqual(changes, ['1', '1.', '1']);
});

test('IME 组合中不校验，结束后归一化并通知一次，非法输入回退', async () => {
  const changes = [];
  const input = await render({ type: 'number', defaultValue: '1', onChange: event => changes.push(event.target.value) });
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  async function compose(text) {
    await act(() => input.dispatchEvent(new dom.window.CompositionEvent('compositionstart', { bubbles: true })));
    await act(() => {
      setter.call(input, text);
      input.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true, isComposing: true }));
    });
    assert.equal(input.value, text);
    await act(() => input.dispatchEvent(new dom.window.CompositionEvent('compositionend', { bubbles: true, data: text })));
  }
  await compose('１２。３');
  assert.equal(input.value, '12.3');
  assert.deepEqual(changes, ['12.3']);
  await compose('中文');
  assert.equal(input.value, '12.3');
  assert.deepEqual(changes, ['12.3']);
});

test('原生表单提交值和 reset，取消 reset 保留编辑值', async () => {
  await render({}, h('form', {}, h(components.Input, { name: 'amount', type: 'number', defaultValue: '1.2' })));
  const input = container.querySelector('input'), form = container.querySelector('form');
  const user = userEvent.setup({ document });
  await act(async () => { await user.clear(input); await user.type(input, '3.4'); });
  assert.equal(new dom.window.FormData(form).get('amount'), '3.4');
  await act(async () => { form.reset(); });
  assert.equal(input.value, '1.2');
  await act(async () => { await user.clear(input); await user.type(input, '5'); });
  form.addEventListener('reset', event => event.preventDefault(), { once: true });
  await act(async () => { form.reset(); });
  assert.equal(input.value, '5');
});

test('Input 样式仅引用局部 tokens，主题引用和所有响应式维度均有定义', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = path => readFile(new URL(path, import.meta.url), 'utf8');
  const styles = await read('./styles.css');
  const tokens = await read('./tokens.css');
  const design = await read('./design.tokens.css');
  const localDefinitions = new Set([...`${tokens}\n${design}`.matchAll(/(--input-[\w-]+)\s*:/g)].map(match => match[1]));
  const dimensions = ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size'];
  // Base CSS must resolve without a component injecting inline styles.
  for (const match of `${tokens}\n${design}`.matchAll(/var\((--input-[\w-]+)/g)) assert(localDefinitions.has(match[1]), match[1]);
  // Responsive references must be backed by actual rendered inline declarations.
  await render({ size: { base: 'sm', sm: 'xs', md: 'base', lg: 'lg', xl: 'xl', '2xl': '2xl' } });
  const renderedStyle = container.firstChild.style;
  for (let index = 0; index < renderedStyle.length; index++) localDefinitions.add(renderedStyle.item(index));
  for (const match of styles.matchAll(/var\((--[\w-]+)/g)) assert(match[1].startsWith('--input-'), match[1]);
  for (const match of `${styles}\n${tokens}\n${design}`.matchAll(/var\((--input-[\w-]+)/g)) assert(localDefinitions.has(match[1]), match[1]);
  for (const theme of ['light', 'dark']) {
    const [colors, fonts, radius] = await Promise.all(['colors', 'typography', 'radius'].map(file => read(`../themes/${theme}/semantic/${file}.css`)));
    const definitions = new Set([...`${colors}\n${fonts}\n${radius}`.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
    for (const match of `${tokens}\n${design}`.matchAll(/var\((--(?!input-)[\w-]+)/g)) assert(definitions.has(match[1]), `${theme}/${match[1]}`);
  }
  for (const [breakpoint, width] of [['sm', 40], ['md', 48], ['lg', 64], ['xl', 80], ['2xl', 96]]) {
    assert(styles.includes(`@media (min-width: ${width}rem)`));
    assert(styles.includes(`[data-size-${breakpoint}]`));
    for (const dimension of dimensions) assert(styles.includes(`--input-${dimension}: var(--input-${breakpoint}-${dimension});`));
  }
});

test('组级禁用和只读下发，显式 false 覆盖，属性不泄漏到 div', async () => {
  const { InputGroup, InputGroupInput, InputGroupTextarea } = components;
  await render({}, h(InputGroup, { disabled: true },
    h(InputGroupInput, { type: 'number', showNumberStepper: true, clearable: true, defaultValue: '1' }),
    h(InputGroupTextarea), h(InputGroupInput, { disabled: false })));
  assert(container.querySelector('input').disabled);
  assert(container.querySelector('textarea').disabled);
  assert(!container.querySelectorAll('input')[1].disabled);
  assert.equal(container.querySelector('button'), null);
  assert(!container.firstChild.hasAttribute('disabled'));
  await render({}, h(InputGroup, { readOnly: true }, h(InputGroupInput), h(InputGroupTextarea), h(InputGroupInput, { readOnly: false })));
  assert(container.querySelector('input').readOnly);
  assert(container.querySelector('textarea').readOnly);
  assert(!container.querySelectorAll('input')[1].readOnly);
  assert(!container.firstChild.hasAttribute('readonly'));
});

test('显式 variant 仍保持组合布局，Input 的 slot 保留，子级 invalid 影响外框', async () => {
  const { readFile } = await import('node:fs/promises');
  const sheet = document.createElement('style');
  sheet.textContent = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  document.head.append(sheet);
  try {
    await render({}, h(components.InputGroup, {},
      h(components.InputGroupInput, { variant: 'outline', 'aria-invalid': 'grammar' })));
    const input = container.querySelector('input');
    assert.equal(input.dataset.slot, 'input');
    assert.equal(input.parentElement.dataset.slot, 'input-group-control');
    assert(input.parentElement.hasAttribute('data-grouped'));
    assert.equal(getComputedStyle(container.firstChild).getPropertyValue('--input-border-color').trim(), 'var(--color-feedback-error)');
    await render({}, h(components.InputGroup, {}, h(components.InputGroupTextarea, { 'aria-invalid': true })));
    assert.equal(getComputedStyle(container.firstChild).getPropertyValue('--input-focus-border-color').trim(), 'var(--color-feedback-error)');
    await render({}, h(components.InputGroup, {}, h(components.InputGroupInput, { 'aria-invalid': false })));
    assert.notEqual(getComputedStyle(container.firstChild).getPropertyValue('--input-border-color').trim(), 'var(--color-feedback-error)');
  } finally { sheet.remove(); }
});

test('组内点击不会聚焦 aria-disabled 的 combobox', async () => {
  await render({}, h(components.InputGroup, {},
    h('div', { role: 'combobox', 'aria-disabled': true, tabIndex: 0 }, 'disabled trigger'),
    h(components.InputGroupInput), h(components.InputGroupAddon, {}, 'label')));
  await act(async () => { await userEvent.setup({ document }).click(container.querySelector('[data-slot="input-group-addon"]')); });
  assert.equal(document.activeElement, container.querySelector('input'));
});

test('数字归一化只接受明确的 locale 小数分隔符，不猜测千分位', () => {
  const { normalizeNumericInput, isNumericDraft, finalizeNumberValue } = numberUtils;
  assert.equal(normalizeNumericInput('１２。３', 'zh-CN'), '12.3');
  assert.equal(normalizeNumericInput('12,3', 'de-DE'), '12.3');
  for (const [value, locale] of [['1,234', 'en-US'], ['1,234,567', 'en-US'], ['1,234,567', 'de-DE'], ['1.234,56', 'de-DE']]) {
    assert(!isNumericDraft(normalizeNumericInput(value, locale)), `${locale}/${value}`);
  }
  assert.equal(finalizeNumberValue('1.235', 2), '1.24');
  assert.equal(finalizeNumberValue('9.995', 2), '10.00');
});

test('步进结果同时满足精度和边界，空区间禁用，负 min 按 0', () => {
  const step = options => numberUtils.computeSteppedNumberValue({ value: '0.3', direction: 'up', step: '0.1', ...options });
  assert.deepEqual(step({ max: '0.35', decimal: 1 }), { nextValue: '0.3', reason: 'boundary' });
  assert.deepEqual(step({ value: '0.2', max: '0.35', decimal: 1 }), { nextValue: '0.3', reason: 'ok' });
  assert.deepEqual(step({ value: '0.2', direction: 'down', min: '0.15', decimal: 1 }), { nextValue: '0.2', reason: 'boundary' });
  assert.equal(step({ value: '0', direction: 'down', min: '-10' }).nextValue, '0');
  assert.equal(step({ min: '0.31', max: '0.35', decimal: 1 }).reason, 'boundary');
  assert.equal(step({ max: '-1' }).reason, 'boundary');
  assert.equal(step({ value: '999999999999999999999999999.1', step: '0.1' }).nextValue, '999999999999999999999999999.2');
});

test('受控数字在中间粘贴后保留插入位置', async () => {
  const React = await import('react');
  function Controlled() {
    const [value, setValue] = React.useState('1234');
    return h(components.Input, { type: 'number', value, onChange: event => setValue(event.target.value) });
  }
  const input = await render({}, h(Controlled));
  const user = userEvent.setup({ document });
  await act(async () => { await user.click(input); input.setSelectionRange(1, 2); await user.paste('９'); });
  assert.equal(input.value, '1934');
  assert.equal(input.selectionStart, 2);
});

test('只读有独立背景，组级禁用被子项覆盖时外框保持可用外观', async () => {
  const { readFile } = await import('node:fs/promises');
  const sheet = document.createElement('style');
  sheet.textContent = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  document.head.append(sheet);
  // Use concrete colors to inspect the cascade independently of CSS var support in JSDOM.
  sheet.textContent = sheet.textContent.replaceAll('var(--input-readonly-bg)', 'rgb(240, 240, 240)')
    .replaceAll('var(--input-disabled-bg)', 'rgb(220, 220, 220)')
    .replaceAll('var(--input-bg)', 'rgb(255, 255, 255)')
    .replaceAll('var(--input-grouped-bg)', 'transparent');
  const background = element => getComputedStyle(element).backgroundColor;
  try {
    await render({ readOnly: true });
    assert.equal(background(container.firstChild), 'rgb(240, 240, 240)');
    await render({}, h(components.Textarea, { readOnly: true }));
    assert.equal(background(container.firstChild), 'rgb(240, 240, 240)');
    await render({}, h(components.InputGroup, { readOnly: true }, h(components.InputGroupInput)));
    assert.equal(background(container.firstChild), 'rgb(240, 240, 240)');
    await render({}, h(components.InputGroup, { readOnly: true }, h(components.InputGroupInput, { readOnly: false })));
    assert.equal(background(container.firstChild), 'rgb(255, 255, 255)');
    await render({}, h(components.InputGroup, { disabled: true },
      h(components.InputGroupInput), h(components.InputGroupInput, { disabled: false })));
    assert.equal(background(container.firstChild), 'rgb(255, 255, 255)');
    assert.equal(background(container.querySelector('input:disabled').parentElement), 'rgb(220, 220, 220)');
    assert.equal(background(container.querySelector('input:enabled').parentElement), 'rgba(0, 0, 0, 0)');
    await render({}, h(components.InputGroup, { disabled: true, readOnly: true }, h(components.InputGroupInput)));
    assert.equal(background(container.firstChild), 'rgb(220, 220, 220)');
  } finally { sheet.remove(); }
});
