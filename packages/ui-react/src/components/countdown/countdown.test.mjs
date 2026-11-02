import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef, StrictMode } from 'react';
import postcss from 'postcss';

const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));
let Countdown, useCountdown, createRoot, root, container, dom, temporary;
const globalNames = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node'];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>');
  for (const name of globalNames) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  const output = path.join(packageRoot, '.test-output');
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(path.join(output, 'countdown-'));
  const bundle = await build({
    entryPoints: [path.join(packageRoot, 'src/components/countdown/index.tsx')],
    bundle: true, packages: 'external', platform: 'node', format: 'esm',
    jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'countdown.mjs');
  await writeFile(file, bundle.outputFiles[0].contents);
  ({ Countdown, useCountdown } = await import(file));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});
after(async () => {
  dom.window.close();
  for (const name of globalNames) delete globalThis[name];
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  await rm(temporary, { recursive: true, force: true });
});
async function render(props, wrapper) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(wrapper ? wrapper(h(Countdown, props)) : h(Countdown, props)));
  return container.firstElementChild;
}
function digits() { return [...container.querySelectorAll('.bkreact-countdown__value')].map(node => node.textContent); }
async function tick(t, ms) { await act(() => t.mock.timers.tick(ms)); }
function clock(t) { t.mock.timers.enable({ apis: ['Date', 'setInterval', 'setTimeout'], now: 1800000000000 }); }

test('受控展示：值优先、OTP 累计秒、前导零、日期标签和 ref', async () => {
  const ref = createRef();
  const node = await render({ value: 90000, duration: 1, targetTime: 0, scene: 'otp', ref, className: 'custom' });
  assert.equal(ref.current, node);
  assert.deepEqual(digits(), ['90']);
  assert.equal(node.getAttribute('role'), 'timer');
  assert.equal(node.getAttribute('aria-live'), 'off');
  assert(node.classList.contains('custom'));
  await render({ value: 3661000, units: ['minutes', 'seconds'] });
  assert.deepEqual(digits(), ['61', '01']);
  await render({ value: 1000, showZeroUnits: false });
  assert.deepEqual(digits(), ['01']);
  await render({ value: 90061000, scene: 'day', padDays: true, labels: { days: '日' } });
  assert.deepEqual(digits(), ['01', '01', '01', '01']);
  assert.equal(container.querySelector('.bkreact-countdown__label').textContent, '日');
});

test('计时归零、回调一次，回调更新不重新开始', async t => {
  clock(t);
  let finished = 0;
  const changes = [];
  const onFinish = () => finished++;
  await render({ duration: 2, onFinish, onChange: value => changes.push(value) });
  await tick(t, 1000);
  assert.deepEqual(digits(), ['00', '00', '01']);
  await render({ duration: 2, onFinish, onChange: value => changes.push(value * 10) });
  await tick(t, 1000);
  assert.equal(finished, 1);
  assert.deepEqual(changes, [1000, 0]);
  assert(container.firstChild.hasAttribute('data-finished'));
  await tick(t, 5000);
  assert.equal(finished, 1);
  assert.equal(changes.length, 2);
});

test('目标时间支持秒时间戳、毫秒时间戳、Date 和字符串；延迟按墙钟校正', async t => {
  clock(t);
  const deadline = Date.now() + 10000;
  for (const targetTime of [deadline / 1000, deadline, new Date(deadline), new Date(deadline).toISOString()]) {
    await render({ targetTime, duration: 1 });
    assert.deepEqual(digits(), ['00', '00', '10']);
  }
  t.mock.timers.setTime(deadline - 2000);
  await tick(t, 1000);
  assert.deepEqual(digits(), ['00', '00', '01']);
});

test('配置切换与 autoStart：冻结、重启、进入受控模式后停止回调', async t => {
  clock(t);
  let finished = 0;
  const onFinish = () => finished++;
  await render({ duration: 2, autoStart: false, onFinish });
  await tick(t, 3000);
  assert.deepEqual(digits(), ['00', '00', '02']);
  await render({ duration: 2, autoStart: true, onFinish });
  await tick(t, 1000);
  assert.deepEqual(digits(), ['00', '00', '01']);
  await render({ duration: 5, onFinish });
  assert.deepEqual(digits(), ['00', '00', '05']);
  await render({ value: 2000, onFinish });
  await tick(t, 10000);
  assert.equal(finished, 0);
  assert.deepEqual(digits(), ['00', '00', '02']);
  await render({ value: 1000, onFinish });
  assert.deepEqual(digits(), ['00', '00', '01']);
});

test('结束文案、非法输入、空单位、自定义渲染和动画标记', async () => {
  let node = await render({ value: -100, expiredText: '已结束' });
  assert.equal(node.textContent, '已结束');
  await render({ value: NaN, units: [] });
  assert.equal(container.textContent, '');
  node = await render({ value: 1200, scene: 'custom', animation: 'wheel', units: ['seconds'],
    children: (parts, items, helpers) => {
      assert.equal(parts.total, 1200);
      assert.equal(helpers.finished, false);
      assert.equal(helpers.animation, 'wheel');
      return helpers.renderDigit(items[0], 'custom-digit');
    },
  });
  assert.equal(node.dataset.animation, 'wheel');
  assert.equal(node.querySelector('.custom-digit .bkreact-countdown__value').textContent, '02');
  await render({ value: 61000, separator: unit => `[${unit}]`, units: ['minutes', 'seconds'] });
  assert.equal(container.querySelector('.bkreact-countdown__separator').textContent, '[minutes]');
});

test('卸载清理计时器，StrictMode 只触发一次完成回调', async t => {
  clock(t);
  let finished = 0;
  await render({ duration: 1, onFinish: () => finished++ }, child => h(StrictMode, null, child));
  await tick(t, 1000);
  assert.equal(finished, 1);
  await render({ duration: 2, onFinish: () => finished++ });
  await act(() => root.unmount());
  root = undefined;
  await tick(t, 5000);
  assert.equal(finished, 1);
});

test('useCountdown 可以独立使用', async t => {
  clock(t);
  function Probe() {
    const { remaining, parts, finished } = useCountdown({ duration: 1 });
    return h('output', null, `${remaining}/${parts.seconds}/${finished}`);
  }
  await render({}, () => h(Probe));
  assert.equal(container.textContent, '1000/1/false');
  await tick(t, 1000);
  assert.equal(container.textContent, '0/0/true');
});

test('已过期来源在 StrictMode 下只完成一次，无来源和受控值不触发回调', async t => {
  clock(t);
  let finished = 0;
  const onFinish = () => finished++;
  await render({ duration: 0, onFinish }, child => h(StrictMode, null, child));
  await tick(t, 1);
  assert.equal(finished, 1);
  await render({ onFinish });
  await tick(t, 1000);
  assert.equal(finished, 1);
  await render({ value: 0, onFinish });
  await tick(t, 1000);
  assert.equal(finished, 1);
});

test('滚轮逐位保留旧值，新旧数字同步运动；初次挂载和不变的数字不播放', async () => {
  await render({ value: 12000, scene: 'otp', animation: 'wheel' });
  assert.equal(container.querySelectorAll('[data-moving]').length, 0);
  await render({ value: 11000, scene: 'otp', animation: 'wheel' });
  assert.equal(container.querySelectorAll('[data-moving]').length, 1);
  assert.equal(container.querySelector('.bkreact-countdown__wheel-old').textContent, '2');
  assert.equal(container.querySelector('.bkreact-countdown__wheel-new').textContent, '1');
  const transition = container.querySelector('.bkreact-countdown__transition');
  await render({ value: 10900, scene: 'otp', animation: 'wheel' });
  assert.equal(container.querySelector('.bkreact-countdown__transition'), transition);
  await act(() => transition.lastElementChild.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
  assert.equal(container.querySelectorAll('[data-moving]').length, 0);
  assert.deepEqual(digits(), ['11']);
});

test('翻页使用连续旋转的正反面翻板，动画完成后清理旧值', async () => {
  await render({ value: 10000, scene: 'otp', animation: 'flip' });
  assert.equal(container.querySelectorAll('.bkreact-countdown__transition').length, 0);
  await render({ value: 9000, scene: 'otp', animation: 'flip' });
  const cells = container.querySelectorAll('[data-moving]');
  assert.equal(cells.length, 2);
  const halves = cells[1].querySelectorAll('.bkreact-countdown__half, .bkreact-countdown__flap-face');
  assert.deepEqual([...halves].map(node => node.textContent), ['9', '0', '0', '9']);
  assert.equal(cells[1].querySelectorAll('.bkreact-countdown__flap').length, 1);
  assert.equal(cells[1].querySelector('.bkreact-countdown__flap-face--front').textContent, '0');
  assert.equal(cells[1].querySelector('.bkreact-countdown__flap-face--back').textContent, '9');
  await render({ value: 8000, scene: 'otp', animation: 'flip' });
  assert.deepEqual([...container.querySelectorAll('[data-moving]')[1].querySelectorAll('.bkreact-countdown__half, .bkreact-countdown__flap-face')].map(node => node.textContent), ['8', '9', '9', '8']);
  for (const flap of container.querySelectorAll('.bkreact-countdown__flap')) {
    await act(() => flap.dispatchEvent(new dom.window.Event('animationend', { bubbles: true })));
  }
  assert.equal(container.querySelectorAll('[data-moving]').length, 0);
  assert.deepEqual(digits(), ['08']);
  await render({ value: 8000, scene: 'otp', animation: 'wheel' });
  assert.equal(container.querySelectorAll('[data-moving]').length, 0);
  await render({ value: 8000, scene: 'otp', animation: 'none' });
  assert.equal(container.querySelector('.bkreact-countdown__reels'), null);
  assert.deepEqual(digits(), ['08']);
});

test('翻板固定横向位置，保留 3D 正反面，并在整段动画内连续转动', async () => {
  const css = postcss.parse(await readFile(path.join(packageRoot, 'src/components/countdown/styles.css'), 'utf8'));
  const declarations = selector => {
    const result = new Map();
    css.walkRules(rule => {
      if (rule.selector.split(',').map(s => s.trim()).includes(selector)) {
        rule.walkDecls(d => result.set(d.prop, d.value));
      }
    });
    return result;
  };
  for (const selector of ['.bkreact-countdown__half', '.bkreact-countdown__flap', '.bkreact-countdown__flap-face']) {
    assert.equal(declarations(selector).get('left'), 'var(--countdown-inset)');
  }
  assert.equal(declarations('.bkreact-countdown__flap').get('transform-style'), 'var(--countdown-flap-transform-style)');
  assert.equal(declarations('.bkreact-countdown__flap-face').get('backface-visibility'), 'var(--countdown-backface-visibility)');
  assert.equal(declarations('.bkreact-countdown__flap-face--back').get('transform'), 'var(--countdown-flip-back)');
  css.walkAtRules('keyframes', rule => {
    if (rule.params === 'bk-countdown-flip') assert.deepEqual(rule.nodes.map(n => n.selector), ['from', 'to']);
  });
});

test('样式只消费组件 tokens，设计定义来自生成文件，支持减少动态效果', async () => {
  const files = await Promise.all(['styles.css', 'tokens.css', 'design.tokens.css'].map(file =>
    readFile(path.join(packageRoot, 'src/components/countdown', file), 'utf8')));
  const ast = postcss.parse(files.join('\n'));
  const declared = new Set();
  ast.walkDecls(d => { if (d.prop.startsWith('--countdown-')) declared.add(d.prop); });
  ast.walkDecls(d => {
    for (const [, name] of d.value.matchAll(/var\((--countdown-[\w-]+)/g)) assert(declared.has(name), name);
  });
  postcss.parse(files[0]).walkDecls(d => {
    for (const [, name] of d.value.matchAll(/var\((--[\w-]+)/g)) assert(name.startsWith('--countdown-'), name);
  });
  assert.match(files[0], /prefers-reduced-motion: reduce/);
  assert.match(files[2], /Generated by npm run tokens:build/);
});
