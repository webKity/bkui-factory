import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildTokenFiles } from '../../../../../scripts/tokens/build.mjs';

let api, sizeAPI, sizeConfig, createRoot, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const output = fileURLToPath(new URL('../../../../../.test-output/', import.meta.url));
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(`${output}breadcrumb-`);
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))], bundle: true,
    packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  await writeFile(`${temporary}/breadcrumb.mjs`, result.outputFiles[0].contents);
  api = await import(`${temporary}/breadcrumb.mjs`);
  for (const [name, source] of [['size', './size.ts'], ['size-config', '../utils/size.ts']]) {
    const built = await build({ entryPoints: [fileURLToPath(new URL(source, import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false });
    await writeFile(`${temporary}/${name}.mjs`, built.outputFiles[0].contents);
  }
  sizeAPI = await import(`${temporary}/size.mjs`);
  sizeConfig = await import(`${temporary}/size-config.mjs`);
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
async function render(element) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(element));
  return container.firstElementChild;
}

const items = [
  { key: 'home', label: '首页', href: '/home' },
  { key: 'docs', label: '文档', href: '/docs' },
  { key: 'current', label: '当前页', href: '/current' },
];

test('nav/ol/li 原生语义，当前页不导航，分隔符对辅助技术隐藏', async () => {
  const ref = createRef();
  const nav = await render(h(api.Breadcrumb, { items, ref, className: 'custom', 'aria-label': '当前位置', id: 'path' }));
  assert.equal(ref.current, nav);
  assert.equal(nav.tagName, 'NAV');
  assert.equal(nav.id, 'path');
  assert.equal(nav.getAttribute('aria-label'), '当前位置');
  assert(nav.classList.contains('custom'));
  assert.equal(nav.firstElementChild.tagName, 'OL');
  assert.deepEqual([...nav.querySelector('ol').children].map(el => el.tagName), ['LI', 'LI', 'LI']);
  assert.equal(nav.querySelectorAll('a').length, 2);
  assert.equal(nav.querySelector('[aria-current="page"]').textContent, '当前页');
  assert.equal(nav.querySelector('[aria-current="page"]').tagName, 'SPAN');
  const separators = [...nav.querySelectorAll('.bkreact-breadcrumb__separator')];
  assert.equal(separators.length, 2);
  assert(separators.every(el => el.textContent === '/' && el.getAttribute('aria-hidden') === 'true'));
});

test('链接透传原生属性与事件；禁用及当前项不会执行链接回调', async () => {
  let calls = 0;
  const onClick = event => { event.preventDefault(); calls++; };
  const nav = await render(h(api.Breadcrumb, { items: [
    { label: '可点击', href: '/open', target: '_blank', rel: 'noreferrer', onClick, className: 'custom-link' },
    { label: '禁用', href: '/disabled', disabled: true, onClick, onClickCapture: onClick, tabIndex: 0 },
    { label: '当前', href: '/current', onClick },
  ] }));
  const link = nav.querySelector('a');
  assert.equal(link.getAttribute('href'), '/open');
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noreferrer');
  assert(link.classList.contains('custom-link'));
  await act(() => link.click());
  assert.equal(calls, 1);
  const disabled = nav.querySelector('[aria-disabled="true"]');
  assert.equal(disabled.tagName, 'SPAN');
  assert.equal(disabled.tabIndex, -1);
  assert(!disabled.hasAttribute('href'));
  await act(() => { disabled.click(); nav.querySelector('[aria-current]').click(); });
  assert.equal(calls, 1);
});

test('空列表、单项、静态祖先、图标与自定义分隔符', async () => {
  let nav = await render(h(api.Breadcrumb, { items: [] }));
  assert.equal(nav, null);
  nav = await render(h(api.Breadcrumb, { items: [{ label: '单项' }], 'aria-labelledby': 'heading' }));
  assert(!nav.hasAttribute('aria-label'));
  assert.equal(nav.querySelectorAll('[aria-current]').length, 1);
  assert.equal(nav.querySelectorAll('.bkreact-breadcrumb__separator').length, 0);
  nav = await render(h(api.Breadcrumb, { items: [{ label: '静态', icon: h('svg') }, { label: '当前' }], separator: h('svg', { 'data-separator': true }) }));
  assert.equal(nav.querySelectorAll('a').length, 0);
  assert.equal(nav.querySelector('.bkreact-breadcrumb__icon').getAttribute('aria-hidden'), 'true');
  assert(nav.querySelector('.bkreact-breadcrumb__separator svg'));
  nav = await render(h(api.Breadcrumb, { items, separator: null }));
  assert.equal(nav.querySelectorAll('.bkreact-breadcrumb__separator').length, 0);
});

test('响应式尺寸更新清除旧断点，忽略不支持的内联样式', async () => {
  let nav = await render(h(api.Breadcrumb, { items, style: { color: 'red' }, size: { base: 'xs', md: 'lg' } }));
  assert.equal(nav.dataset.size, 'responsive');
  assert(nav.hasAttribute('data-size-md'));
  assert(!nav.hasAttribute('data-size-sm'));
  assert.equal(nav.style.color, '');
  assert.equal(nav.style.getPropertyValue('--breadcrumb-base-font-size'), 'var(--breadcrumb-size-xs-font-size)');
  assert.equal(nav.style.getPropertyValue('--breadcrumb-md-gap'), 'var(--breadcrumb-size-lg-gap)');
  nav = await render(h(api.Breadcrumb, { items, size: 'sm' }));
  assert.equal(nav.dataset.size, 'sm');
  assert(!nav.hasAttribute('data-size-md'));
  assert.equal(nav.style.getPropertyValue('--breadcrumb-md-gap'), '');
});

test('SSR 保留导航与当前页语义', () => {
  const markup = renderToStaticMarkup(h(api.Breadcrumb, { items }));
  assert.match(markup, /<nav/);
  assert.match(markup, /aria-current="page"/);
  assert(!markup.includes('href="/current"'));
});

test('设计 tokens 与生成物一致，样式只消费局部 tokens，尺寸和断点契约完整', async () => {
  const outputs = await buildTokenFiles();
  const design = await readFile(new URL('./design.tokens.css', import.meta.url), 'utf8');
  const designPath = path.relative(fileURLToPath(new URL('../../../../../', import.meta.url)), fileURLToPath(new URL('./design.tokens.css', import.meta.url))).split(path.sep).join('/');
  assert.equal(outputs.get(designPath), design);
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  const declared = new Set();
  const used = new Set();
  for (const css of [design, tokens, styles]) postcss.parse(css).walkDecls(decl => {
    if (decl.prop.startsWith('--breadcrumb-')) declared.add(decl.prop);
    for (const match of decl.value.matchAll(/var\((--breadcrumb-[\w-]+)\)/g)) used.add(match[1]);
  });
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    for (const dimension of ['font-size', 'line-height', 'gap', 'icon-size']) {
      assert(declared.has(`--breadcrumb-size-${size}-${dimension}`));
    }
  }
  // Only variables actually emitted by size.ts count as runtime declarations.
  const responsive = Object.fromEntries(['base', ...sizeConfig.sizeBreakpoints].map(scope => [scope, 'base']));
  for (const variable of Object.keys(sizeAPI.getBreadcrumbSizeStyle(responsive))) declared.add(variable);
  for (const variable of used) assert(declared.has(variable), variable);
  postcss.parse(styles).walkDecls(decl => {
    for (const match of decl.value.matchAll(/var\((--[\w-]+)/g)) assert(match[1].startsWith('--breadcrumb-'));
  });
  const cssBreakpoints = {};
  postcss.parse(styles).walkAtRules('media', rule => {
    rule.walkRules(selector => {
      const match = selector.selector.match(/\[data-size-([\w]+)\]/);
      if (!match) return;
      const scope = match[1];
      assert.equal(rule.params, `(min-width: ${sizeConfig.sizeBreakpointMinWidths[scope]}rem)`);
      cssBreakpoints[scope] = true;
      const runtime = sizeAPI.getBreadcrumbSizeStyle({ base: 'xs', [scope]: 'lg' });
      const references = [];
      selector.walkDecls(decl => references.push(decl.value.slice(4, -1)));
      assert.deepEqual(references.sort(), Object.keys(runtime).filter(key => key.startsWith(`--breadcrumb-${scope}-`)).sort());
      for (const reference of references) assert.match(runtime[reference], /var\(--breadcrumb-size-lg-/);
    });
  });
  assert.deepEqual(Object.keys(cssBreakpoints).sort(), [...sizeConfig.sizeBreakpoints].sort());
});

test('null href 与缺失 href 是静态祖先，空字符串仍为原生链接', async () => {
  const nav = await render(h(api.Breadcrumb, { items: [
    { label: 'null', href: null }, { label: 'undefined' }, { label: 'empty', href: '' }, { label: '当前' },
  ] }));
  assert.equal(nav.querySelectorAll('a').length, 1);
  assert.equal(nav.querySelector('a').getAttribute('href'), '');
  assert.equal(nav.querySelector('a').textContent, 'empty');
});

test('名称尊重显式 null，aria-labelledby 与 aria-label 均保留', async () => {
  let nav = await render(h(api.Breadcrumb, { items }));
  assert.equal(nav.getAttribute('aria-label'), 'Breadcrumb');
  nav = await render(h(api.Breadcrumb, { items, 'aria-label': null }));
  assert(!nav.hasAttribute('aria-label'));
  const heading = document.createElement('h2');
  heading.id = 'breadcrumb-title';
  heading.textContent = '引用名称';
  document.body.append(heading);
  nav = await render(h(api.Breadcrumb, { items, 'aria-label': '自定义名称', 'aria-labelledby': heading.id }));
  assert.equal(nav.getAttribute('aria-label'), '自定义名称');
  assert.equal(nav.getAttribute('aria-labelledby'), heading.id);
  const { within } = await import('storybook/test');
  assert.equal(within(container).getByRole('navigation', { name: '引用名称' }), nav);
  heading.remove();
});

test('静态项透传通用属性与事件，禁用和当前项保留属性并移除事件', async () => {
  let calls = 0;
  const onClick = () => calls++;
  const nav = await render(h(api.Breadcrumb, { items: [
    { label: '静态', href: null, 'data-testid': 'static', 'aria-details': 'details', role: 'note', tabIndex: 0, onClick },
    { label: '禁用', href: '/disabled', disabled: true, 'data-testid': 'disabled', 'aria-details': 'details', target: '_blank', onClick, onClickCapture: onClick },
    { label: '当前', disabled: true, 'data-testid': 'current', onClick },
  ] }));
  const staticItem = nav.querySelector('[data-testid="static"]');
  const disabled = nav.querySelector('[data-testid="disabled"]');
  const current = nav.querySelector('[data-testid="current"]');
  assert.equal(staticItem.getAttribute('aria-details'), 'details');
  assert.equal(staticItem.getAttribute('role'), 'note');
  assert.equal(staticItem.tabIndex, 0);
  assert.equal(disabled.getAttribute('aria-details'), 'details');
  assert(!disabled.hasAttribute('target'));
  assert.equal(current.getAttribute('aria-current'), 'page');
  assert(!current.hasAttribute('aria-disabled'));
  assert(!current.hasAttribute('data-disabled'));
  await act(() => { staticItem.click(); disabled.click(); current.click(); });
  assert.equal(calls, 1);
});

test('aria-disabled 由 disabled 控制，JS 调用也不会产生伪禁用链接', async () => {
  const nav = await render(h(api.Breadcrumb, { items: [{ label: '链接', href: '/home', 'aria-disabled': true }, { label: '当前' }] }));
  assert(!nav.querySelector('a').hasAttribute('aria-disabled'));
});

test('false、空字符串与 null 分隔符不生成空节点，数字 0 正常显示', async () => {
  for (const separator of [false, true, '', null]) {
    const nav = await render(h(api.Breadcrumb, { items, separator }));
    assert.equal(nav.querySelectorAll('.bkreact-breadcrumb__separator').length, 0);
  }
  const nav = await render(h(api.Breadcrumb, { items, separator: 0 }));
  assert.deepEqual([...nav.querySelectorAll('.bkreact-breadcrumb__separator')].map(el => el.textContent), ['0', '0']);
});

test('size.ts 精确生成显式 scope 的全部变量，更新和七档值一致', () => {
  const dimensions = ['font-size', 'line-height', 'gap', 'icon-size'];
  for (const value of sizeConfig.componentSizes) {
    const style = sizeAPI.getBreadcrumbSizeStyle({ base: value, md: value, xl: value });
    const expected = Object.fromEntries(['base', 'md', 'xl'].flatMap(scope => dimensions.map(dimension => [
      `--breadcrumb-${scope}-${dimension}`, `var(--breadcrumb-size-${value}-${dimension})`,
    ])));
    assert.deepEqual(style, expected);
  }
});
