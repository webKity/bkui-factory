import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

const project = fileURLToPath(new URL('../', import.meta.url));
let dom, temporary, root, container, Button, ThemeProvider, Loading, BKIcon, render;
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost' });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'ShadowRoot', 'Document', 'Element', 'Node', 'Event', 'MouseEvent', 'getComputedStyle']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: name === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await mkdir(path.join(project, '.test-output'), { recursive: true });
  temporary = await mkdtemp(path.join(project, '.test-output/native-'));
  const result = await build({
    entryPoints: [path.join(project, 'packages/ui-native/src/index.ts')],
    bundle: true, packages: 'external', platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      'react-native': 'react-native-web',
      'nativewind': path.join(project, 'node_modules/nativewind/dist/module/index.js'),
      'react-native-css': path.join(project, 'node_modules/react-native-css/dist/module/runtime.js'),
      '@react-native/assets-registry/registry': path.join(project, 'node_modules/@react-native/assets-registry/registry.js'),
      'react-native-svg': path.join(project, 'node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js'),
    },
  });
  const file = path.join(temporary, 'native.cjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Button, ThemeProvider, Loading, BKIcon } = (await import(file)).default);
  const { createRoot } = await import('react-dom/client');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  render = async (props, mode = 'light') => {
    await act(() => root.render(h(ThemeProvider, { mode }, h(Button, props, '提交'))));
    return container.querySelector('[role="button"]');
  };
});
after(async () => {
  if (root) await act(() => root.unmount());
  dom?.window.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'ShadowRoot', 'Document', 'Element', 'Node', 'Event', 'MouseEvent', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

test('RN Button 通过实际 RN Web 渲染，onPress、loading、disabled 及主题切换生效', async () => {
  let presses = 0;
  let button = await render({ onPress: () => presses++ });
  assert(button);
  await act(() => button.click());
  assert.equal(presses, 1);
  assert(button.className.includes('bg-[var(--bk-button-bg)]'));
  const variableHost = () => [...container.querySelectorAll('[style]')].find(node => node.style.getPropertyValue('--bk-button-bg'));
  const light = variableHost().style.getPropertyValue('--bk-button-bg');
  button = await render({ onPress: () => presses++ }, 'dark');
  assert.notEqual(variableHost().style.getPropertyValue('--bk-button-bg'), light);
  button = await render({ onPress: () => presses++, loading: true });
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert(button.querySelector('[data-testid="bk-button-spinner"]'));
  assert(!button.querySelector('[role="progressbar"]'), '按钮内的装饰 Loading 不重复播报');
  await act(() => button.click());
  assert.equal(presses, 1);
  button = await render({ onPress: () => presses++, disabled: true });
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert(!container.querySelector('[role="progressbar"]'));
  await act(() => button.click());
  assert.equal(presses, 1);
  button = await render({ onPress: () => presses++ });
  await act(() => button.click());
  assert.equal(presses, 2);
});

test('RN Icon 使用共享的 Figma/旧图标路径，保留 variant、颜色与无障碍名称', async () => {
  const { getIconDefinition } = await import('@bkreact/assets/icons');
  for (const [name, variant] of [['loader', undefined], ['check', 'regular'], ['check', 'filled']]) {
    const definition = getIconDefinition(name, variant);
    assert(definition);
    await act(() => root.render(h(ThemeProvider, {}, h(BKIcon, { name, variant, color: '#123456', size: 24, ariaLabel: '图标' }))));
    const svg = container.querySelector('svg');
    assert(svg);
    assert.equal(svg.getAttribute('viewBox'), definition.viewBox);
    assert.equal(svg.getAttribute('aria-label'), '图标');
    assert.deepEqual([...svg.querySelectorAll('path')].map(node => node.getAttribute('d')), definition.paths.map(node => node.d));
    assert([...svg.querySelectorAll('path')].every(node => node.getAttribute('fill') === '#123456' || node.getAttribute('fill') === 'none'));
  }
  await act(() => root.render(h(BKIcon, { name: 'missing-icon' })));
  assert(!container.querySelector('svg'));
});

test('RN Loading 的三种类型、尺寸与装饰模式均可渲染，并在卸载时清理', async () => {
  const { LOGO_PATHS } = await import('@bkreact/assets/logo');
  for (const type of ['normal', 'rect', 'logo']) {
    await act(() => root.render(h(ThemeProvider, {}, h(Loading, { type, size: 32, fillColor: '#123456', speed: 1200 }))));
    const loading = container.querySelector('[role="progressbar"]');
    assert(loading, type);
    assert.equal(loading.getAttribute('aria-label'), '加载中');
    if (type === 'normal') assert(loading.querySelector('svg'));
    if (type === 'rect') assert.equal(loading.querySelectorAll('[style*="scaleY"]').length, 5);
    if (type === 'logo') {
      const paths = [...loading.querySelectorAll('path')].map(node => node.getAttribute('d'));
      assert.deepEqual(paths, [...LOGO_PATHS, ...LOGO_PATHS]);
    }
  }
  await act(() => root.render(h(Loading, { 'aria-hidden': true })));
  assert(!container.querySelector('[role="progressbar"]'));
  await act(() => root.render(null));
});

test('NativeWind 自定义 className 能覆盖组件默认工具类', async () => {
  const button = await render({ className: 'bg-red-500 px-8', textClassName: 'text-lg' });
  assert(button.className.includes('bg-red-500'));
  assert(button.className.includes('px-8'));
  assert(!button.className.includes('bg-[var(--bk-button-bg)]'));
  assert(!button.className.includes('px-[var(--bk-button-padding-x)]'));
});


test('RN square / fixed / block 遵循 Web 的宽度优先级，长文案与图标使用独立槽位', async () => {
  const prefix = h(BKIcon, { name: 'check', 'data-testid': 'prefix' });
  const suffix = h(BKIcon, { name: 'check', 'data-testid': 'suffix' });
  let button = await render({ shape: 'square', round: true, prefixIcon: prefix });
  assert(button.className.includes('w-[var(--bk-button-width)]'));
  assert(button.classList.contains('h-[var(--bk-button-height)]'));
  const variables = () => Object.assign({}, ...[...container.querySelectorAll('[style]')].map(node => Object.fromEntries(
    Array.from({ length: node.style.length }, (_, i) => node.style[i]).filter(key => key.startsWith('--bk-button-')).map(key => [key, node.style.getPropertyValue(key)]),
  )));
  assert.equal(variables()['--bk-button-width'], '40px');
  assert.equal(variables()['--bk-button-padding-x'], '0px');
  assert.equal(button.querySelector('[data-testid="prefix"]').getAttribute('width'), '18');
  button = await render({ widthMode: 'fixed', prefixIcon: prefix, suffixIcon: suffix });
  assert.equal(variables()['--bk-button-width'], '130px', '96 内容区 + 2 × 16 padding + 2 × 1 border');
  assert.equal(button.querySelectorAll('svg').length, 2);
  assert(button.querySelector('[data-testid="bk-button-leading"]').hasAttribute('aria-hidden'));
  assert(button.querySelector('[data-testid="bk-button-suffix"]').className.includes('shrink-0'));
  const label = [...button.querySelectorAll('div')].find(node => node.textContent === '提交' && node.className.includes('text-['));
  assert(label.className.includes('shrink'));
  assert(!button.hasAttribute('shape'));
  assert(!button.hasAttribute('widthMode'));
  button = await render({ widthMode: 'fixed', loading: true });
  assert.equal(variables()['--bk-button-width'], '130px');
  assert(button.querySelector('[data-testid="bk-button-spinner"]'));
  button = await render({ block: true, shape: 'square', widthMode: 'fixed' });
  assert(button.className.includes('w-full'));
  assert(!button.className.includes('w-[var(--bk-button-width)]'));
  assert(!button.classList.contains('h-[var(--bk-button-height)]'));
  assert.equal(variables()['--bk-button-padding-x'], '16px');
});

test('RN Button 保留 ref 和原生 style 覆盖，显式图标尺寸和颜色优先', async () => {
  const ref = createRef();
  const button = await render({ ref, style: { marginTop: 7 }, prefixIcon: h(BKIcon, { name: 'check', size: 12, color: '#123456' }) });
  assert.equal(ref.current, button);
  assert.equal(button.style.marginTop, '7px');
  assert.equal(button.querySelector('svg').getAttribute('width'), '12');
  assert(button.querySelector('path').getAttribute('fill') === '#123456');
});

test('同一 mode 下修改 ThemeProvider 的 primitive / semantic，Button、Icon 和 Loading 随当前主题更新', async () => {
  const view = overrides => h(ThemeProvider, { mode: 'light', overrides },
    h(Button, { intent: 'brand' }, '提交'), h(BKIcon, { name: 'check' }), h(Loading, { type: 'rect' }));
  const variable = name => [...container.querySelectorAll('[style]')].map(node => node.style.getPropertyValue(name)).find(Boolean);
  await act(() => root.render(view({ primitive: { 'blue-500': '#123456' } })));
  assert.equal(variable('--bk-semantic-color-action-primary'), '#123456');
  assert.equal(variable('--bk-button-bg'), '#123456');
  const button = container.querySelector('[role="button"]');
  await act(() => root.render(view({ semantic: {
    'color-action-primary': '#654321', 'color-text-primary': '#345678',
    'text-base-size': 21, 'radius-scale-md': 11,
  } })));
  assert.equal(container.querySelector('[role="button"]'), button, '更新主题时不重建按钮');
  assert.equal(variable('--bk-button-bg'), '#654321');
  assert.equal(variable('--bk-button-font-size'), '21px');
  assert.equal(variable('--bk-button-radius'), '11px');
  assert.equal(container.querySelector('svg').getAttribute('color'), '#345678');
  const bar = container.querySelector('[role="progressbar"] [style*="scaleY"]');
  assert.equal(bar.style.backgroundColor, 'rgb(52, 86, 120)');
  await act(() => root.render(view(undefined)));
  assert.notEqual(variable('--bk-button-bg'), '#654321');
});
