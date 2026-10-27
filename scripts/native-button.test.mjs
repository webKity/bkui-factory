import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';

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
  assert(button.querySelector('svg'));
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
