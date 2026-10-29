import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let Calendar, createRoot, dom, temporary, root, container, user;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { userEvent } = await import('storybook/test');
  user = userEvent.setup({ document });
  await mkdir(fileURLToPath(new URL('../../../../../.test-output/', import.meta.url)), { recursive: true });
  temporary = await mkdtemp(fileURLToPath(new URL('../../../../../.test-output/calendar-', import.meta.url)));
  const result = await build({ entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  await writeFile(`${temporary}/calendar.mjs`, result.outputFiles[0].contents);
  ({ Calendar } = await import(`${temporary}/calendar.mjs`));
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

async function render(props = {}) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(h(Calendar, { defaultMonth: new Date(2026, 9, 1), today: new Date(2026, 9, 15), ...props })));
  return container.querySelector('.bkreact-calendar');
}
const day = date => container.querySelector(`[data-day="2026-10-${String(date).padStart(2, '0')}"]:not([data-outside])`);
const clickDay = async date => act(() => day(date).querySelector('button').click());

test('保留单选的内部状态、键盘导航和 ref，禁用日期无法选中', async () => {
  const ref = createRef(), changes = [];
  const calendar = await render({ ref, mode: 'single', disabled: new Date(2026, 9, 12), onDayClick: value => changes.push(value) });
  assert.equal(ref.current, calendar);
  assert(container.querySelector('[data-outside]'));
  await clickDay(12);
  assert.equal(changes.length, 0);
  await clickDay(15);
  assert.equal(day(15).getAttribute('aria-selected'), 'true');
  assert.equal(changes[0].getDate(), 15);
  await act(async () => { day(15).querySelector('button').focus(); await user.keyboard('[ArrowRight][Enter]'); });
  assert.equal(document.activeElement, day(16).querySelector('button'));
  assert.equal(day(16).getAttribute('aria-selected'), 'true');
});

test('受控单选等待回写，required 不允许清空', async () => {
  const changes = [];
  await render({ mode: 'single', selected: new Date(2026, 9, 15), onSelect: value => changes.push(value) });
  await clickDay(16);
  assert.equal(changes[0].getDate(), 16);
  assert.equal(day(15).getAttribute('aria-selected'), 'true');
  assert.equal(day(16).hasAttribute('aria-selected'), false);
  await render({ mode: 'single', required: true, selected: new Date(2026, 9, 16), onSelect: value => changes.push(value) });
  await clickDay(16);
  assert.equal(changes.at(-1).getDate(), 16);
});

test('多选与范围选择保持原生 onSelect 值和状态槽位', async () => {
  const changes = [];
  await render({ mode: 'multiple', onSelect: value => changes.push(value) });
  await clickDay(12);
  await render({ mode: 'multiple', selected: changes.at(-1), onSelect: value => changes.push(value) });
  await clickDay(15);
  assert.deepEqual(changes.at(-1).map(date => date.getDate()), [12, 15]);
  // 更换模式时重新挂载，避免复用第三方库内部选中值。
  await act(() => root.unmount()); root = undefined; container.remove();
  await render({ mode: 'range', onSelect: value => changes.push(value) });
  await clickDay(12);
  await render({ mode: 'range', selected: changes.at(-1), onSelect: value => changes.push(value) });
  await clickDay(15);
  assert.equal(changes.at(-1).from.getDate(), 12);
  assert.equal(changes.at(-1).to.getDate(), 15);
  await render({ mode: 'range', selected: changes.at(-1), onSelect: value => changes.push(value) });
  assert(day(12).classList.contains('bkreact-calendar__range_start'));
  assert(day(13).classList.contains('bkreact-calendar__range_middle'));
  assert(day(15).classList.contains('bkreact-calendar__range_end'));
});

test('合并槽位、响应式尺寸及 style，自定义组件和本地化透传', async () => {
  const { zhCN } = await import('react-day-picker/locale');
  const calendar = await render({ mode: 'single', locale: zhCN, className: 'custom', style: { margin: 7 }, size: { base: 'xs', md: 'lg' }, classNames: { day_button: 'custom-day' }, components: { Footer: props => h('footer', props) }, footer: '选择日期' });
  assert(calendar.classList.contains('custom'));
  assert.equal(calendar.style.margin, '7px');
  assert.equal(calendar.style.getPropertyValue('--calendar-base-day-size'), 'var(--calendar-size-xs-day-size)');
  assert.equal(calendar.style.getPropertyValue('--calendar-md-day-size'), 'var(--calendar-size-lg-day-size)');
  assert(calendar.hasAttribute('data-size-md'));
  assert(!calendar.hasAttribute('data-size-sm'));
  assert(day(15).querySelector('button').classList.contains('custom-day'));
  assert(container.querySelector('footer').textContent.includes('选择日期'));
  assert.match(container.querySelector('.bkreact-calendar__caption_label').textContent, /2026.*10/);
});

test('多月、月份边界与下拉导航透传', async () => {
  const changes = [];
  await render({ numberOfMonths: 2, startMonth: new Date(2026, 9), endMonth: new Date(2026, 11), onMonthChange: value => changes.push(value) });
  assert.equal(container.querySelectorAll('[role="grid"]').length, 2);
  assert.equal(container.querySelector('.bkreact-calendar__button_previous').getAttribute('aria-disabled'), 'true');
  await act(() => container.querySelector('.bkreact-calendar__button_next').click());
  assert.equal(changes[0].getMonth(), 10);
  await render({ captionLayout: 'dropdown', startMonth: new Date(2020, 0), endMonth: new Date(2030, 11) });
  assert(container.querySelector('select.bkreact-calendar__months_dropdown'));
  assert(container.querySelector('select.bkreact-calendar__years_dropdown'));
});
