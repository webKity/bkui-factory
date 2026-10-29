import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, createRef, act } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import postcss from 'postcss';

const project = fileURLToPath(new URL('../../../', import.meta.url));
let temporary, Loading, dom, root, container, createRoot, hydrateRoot, getSizeStyle, getResponsiveSizeAttributes;

before(async () => {
  await mkdir(path.join(project, '.test-output'), { recursive: true });
  temporary = await mkdtemp(path.join(project, '.test-output/loading-'));
  const result = await build({
    stdin: { contents: "export {Loading} from './src/components/loading'; export {getLoadingSizeStyle} from './src/components/loading/size'; export {getResponsiveSizeAttributes} from './src/components/utils/size';", resolveDir: project },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'loading.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Loading, getLoadingSizeStyle: getSizeStyle, getResponsiveSizeAttributes } = await import(file));
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot, hydrateRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove(); container = undefined;
});
after(async () => { dom?.window.close(); await rm(temporary, { recursive: true, force: true }); });

function parse(props) {
  const dom = new JSDOM(renderToStaticMarkup(h(Loading, props)));
  return dom.window.document.querySelector('.bkreact-loading');
}

test('normal 在 SSR 中立即输出 loader SVG；rect 输出五根柱子；logo 保留两层原始路径', () => {
  const normal = parse({});
  assert.equal(normal.getAttribute('role'), 'status');
  assert.equal(normal.getAttribute('aria-label'), '加载中');
  assert(normal.querySelector('.bkreact-icon.bkreact-loading__icon--spin svg path'));
  assert.equal(normal.querySelector('[data-placeholder]'), null);
  const rect = parse({ type: 'rect' });
  assert.equal(rect.querySelectorAll('.bkreact-loading__bar').length, 5);
  assert.equal(rect.querySelector('svg'), null);
  const logo = parse({ type: 'logo' });
  assert.equal(logo.querySelector('svg').getAttribute('viewBox'), '0 360 1024 300');
  assert.equal(logo.querySelectorAll('.bkreact-loading__logo-muted path').length, 4);
  assert.deepEqual(
    [...logo.querySelectorAll('.bkreact-loading__logo-muted path')].map(p => p.getAttribute('d')),
    [...logo.querySelectorAll('.bkreact-loading__logo-overlay path')].map(p => p.getAttribute('d')),
  );
});

test('七档尺寸、像素尺寸、颜色和速度写入 Loading tokens，非法速度回退默认值', () => {
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    assert.equal(parse({ size }).style.getPropertyValue('--loading-base-size'), `var(--loading-size-${size})`);
  }
  const custom = parse({ size: 32, fillColor: 'red', speed: 1200, className: 'custom', 'data-testid': 'spinner' });
  assert.equal(custom.style.getPropertyValue('--loading-base-size'), '32px');
  assert.equal(custom.style.getPropertyValue('--loading-color'), 'red');
  assert.equal(custom.style.getPropertyValue('--loading-duration'), '1200ms');
  assert(custom.classList.contains('custom'));
  assert.equal(custom.dataset.testid, 'spinner');
  assert.equal(custom.dataset.size, 'custom');
  assert.equal(custom.dataset.sizePx, '32');
  assert.equal(parse({ size: 'lg' }).dataset.size, 'lg');
  assert.equal(parse({ size: 'lg' }).hasAttribute('data-size-px'), false);
  for (const speed of [0, -1, Infinity, NaN]) assert.equal(parse({ speed }).style.getPropertyValue('--loading-duration'), '');
  assert.equal(parse({ size: 0 }).style.getPropertyValue('--loading-base-size'), '0px');
  const overridden = parse({ size: 32, speed: 1200, style: { '--loading-size': 'var(--button-icon-size)', '--loading-duration': '2s' } });
  assert.equal(overridden.style.getPropertyValue('--loading-size'), '');
  assert.equal(overridden.style.getPropertyValue('--loading-duration'), '1200ms');
});

test('Loading 的所有样式仅消费局部 tokens，语义 token 在两套主题均存在，动画支持减少动态效果', async () => {
  const css = postcss.parse(await readFile(path.join(project, 'src/components/loading/styles.css'), 'utf8'));
  css.walkDecls(d => {
    assert.match(d.value, /var\(--loading-/);
    for (const match of d.value.matchAll(/var\((--[\w-]+)/g)) assert(match[1].startsWith('--loading-'));
  });
  const animations = [];
  css.walkAtRules('keyframes', node => animations.push(node.params));
  assert.deepEqual(animations, ['bk-loading-spin', 'bk-loading-bars', 'bk-loading-logo-reveal', 'bk-loading-logo-fade']);
  let reduced;
  css.walkAtRules('media', media => { if (media.params === '(prefers-reduced-motion: reduce)') reduced = media; });
  assert(reduced.toString().includes('--loading-reduced-motion-animation'));
  assert(reduced.toString().includes('--loading-logo-end-width'));
  const tokens = postcss.parse((await readFile(path.join(project, 'src/components/loading/design.tokens.css'), 'utf8')) + '\n' + (await readFile(path.join(project, 'src/components/loading/tokens.css'), 'utf8')));
  const tokenNames = new Set();
  tokens.walkDecls(d => { assert(d.prop.startsWith('--loading-')); tokenNames.add(d.prop); });
  const responsiveVariables = getSizeStyle({ base: 'base', sm: 'xs', md: 'sm', lg: 'lg', xl: 'xl', '2xl': '2xl' });
  for (const name of Object.keys(responsiveVariables)) tokenNames.add(name);
  css.walkDecls(d => { for (const match of d.value.matchAll(/var\((--loading-[\w-]+)/g)) assert(tokenNames.has(match[1]), match[1]); });
  for (const theme of ['light', 'dark']) {
    const radius = (await readFile(path.join(project, `src/components/themes/${theme}/semantic/radius.css`), 'utf8')) + (await readFile(path.join(project, `src/components/themes/${theme}/semantic/colors.css`), 'utf8'));
    tokens.walkDecls(d => { for (const match of d.value.matchAll(/var\((--(?!loading-)[\w-]+)/g)) assert(radius.includes(`${match[1]}:`), match[1]); });
  }
});

test('响应式尺寸只在显式配置的断点切换，base 必须提供', async () => {
  const tokens = postcss.parse((await readFile(path.join(project, 'src/components/loading/design.tokens.css'), 'utf8')) + '\n' + (await readFile(path.join(project, 'src/components/loading/tokens.css'), 'utf8')));
  const styles = postcss.parse(await readFile(path.join(project, 'src/components/loading/styles.css'), 'utf8'));
  const inline = getSizeStyle({ base: 'base', sm: 'xs', lg: 'lg', '2xl': '2xl' });
  for (const [width, expected] of [[0, '20px'], [639, '20px'], [640, '16px'], [768, '16px'], [1023, '16px'], [1024, '22px'], [1280, '22px'], [1535, '22px'], [1536, '28px']]) {
    const values = new Map();
    tokens.walkRules('.bkreact-loading', rule => rule.walkDecls(d => values.set(d.prop, d.value)));
    styles.walkAtRules('media', media => {
      const match = media.params.match(/^\(min-width: (\d+)rem\)$/);
      if (match && width >= Number(match[1]) * 16) {
        const scope = { 40: 'sm', 48: 'md', 64: 'lg', 80: 'xl', 96: '2xl' }[match[1]];
        if (Object.hasOwn(inline, `--loading-${scope}-size`)) media.walkDecls(d => values.set(d.prop, d.value));
      }
    });
    for (const [key, value] of Object.entries(inline)) values.set(key, value);
    let resolved = values.get('--loading-size');
    while (resolved.includes('var(')) resolved = resolved.replace(/var\((--[\w-]+)\)/g, (_, name) => {
      assert(values.has(name), `缺少尺寸变量 ${name}`);
      return values.get(name);
    });
    assert.equal(resolved, expected, `viewport ${width}px`);
  }
});

test('装饰 Loading 不重复播报，支持自定义名称、labelledby、原生属性和 ref', async () => {
  assert.equal(parse({ 'aria-hidden': true }).getAttribute('role'), null);
  assert.equal(parse({ 'aria-hidden': true }).getAttribute('aria-label'), null);
  assert.equal(parse({ 'aria-label': '上传中' }).getAttribute('aria-label'), '上传中');
  assert.equal(parse({ 'aria-label': '上传中' }).getAttribute('aria-label'), '上传中');
  assert.equal(parse({ 'aria-label': '' }).getAttribute('aria-label'), '');
  assert.equal(parse({ 'aria-labelledby': 'upload-label' }).getAttribute('aria-label'), null);
  const ref = createRef();
  container = document.createElement('div'); document.body.append(container);
  await act(() => { root = createRoot(container); root.render(h(Loading, { type: 'rect', ref, 'aria-label': '保存中', id: 'saving' })); });
  assert.equal(ref.current, container.querySelector('#saving'));
  assert.equal(ref.current.getAttribute('aria-label'), '保存中');
});

test('同页多个 Logo 的裁剪 ID 独立，水合时 ID 稳定且无错误', async () => {
  const content = h('div', null, h(Loading, { type: 'logo' }), h(Loading, { type: 'logo' }));
  container = document.createElement('div'); document.body.append(container);
  container.innerHTML = renderToString(content);
  const ids = [...container.querySelectorAll('clipPath')].map(n => n.id);
  assert.equal(new Set(ids).size, 2);
  const errors = [];
  await act(() => { root = hydrateRoot(container, content, { onRecoverableError: error => errors.push(error) }); });
  assert.deepEqual([...container.querySelectorAll('clipPath')].map(n => n.id), ids);
  assert.deepEqual(errors, []);
  for (const clip of container.querySelectorAll('g[clip-path]')) {
    assert(ids.some(id => clip.getAttribute('clip-path') === `url(#${id})`));
  }
});


test('非法数字尺寸在开发环境警告并回退，生产环境静默回退，SSR 不抛错', () => {
  const previousEnv = process.env.NODE_ENV;
  const previousWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    for (const environment of ['development', 'production']) {
      process.env.NODE_ENV = environment;
      warnings.length = 0;
      for (const size of [NaN, Infinity, -Infinity, -1]) {
        assert.deepEqual(getSizeStyle(size), getSizeStyle('base'));
        const element = parse({ size });
        assert.equal(element.style.getPropertyValue('--loading-base-size'), 'var(--loading-size-base)');
        assert.equal(element.dataset.size, 'base');
        assert.equal(element.hasAttribute('data-size-px'), false);
      }
      assert.equal(warnings.length, environment === 'development' ? 8 : 0);
      for (const [message] of warnings) assert.match(message, /非负有限数值.*回退到 base/);
    }
  } finally {
    console.warn = previousWarn;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});

test('响应式属性仅标记显式断点，数字和具名尺寸没有断点标记', () => {
  assert.deepEqual(getResponsiveSizeAttributes({ base: 'base', sm: 'xs' }), { 'data-size-sm': true });
  assert.deepEqual(getResponsiveSizeAttributes({ base: 'base' }), {});
  assert.deepEqual(getResponsiveSizeAttributes('lg'), {});
  assert.deepEqual(getResponsiveSizeAttributes(32), {});
  const element = parse({ size: { base: 'base', sm: 'xs' } });
  assert.equal(element.dataset.size, 'responsive');
  assert(element.hasAttribute('data-size-sm'));
  for (const breakpoint of ['md', 'lg', 'xl', '2xl']) assert.equal(element.hasAttribute(`data-size-${breakpoint}`), false);
  assert.equal(element.hasAttribute('data-size-px'), false);
});

test('Logo reveal 宽度与 viewBox 同步，SVG 使用独立 display，旋转不依赖 Tailwind 类', async () => {
  const logo = parse({ type: 'logo' });
  const width = logo.querySelector('svg').getAttribute('viewBox').split(' ')[2];
  assert.equal(logo.querySelector('clipPath rect').getAttribute('width'), width);
  const tokens = postcss.parse(await readFile(path.join(project, 'src/components/loading/tokens.css'), 'utf8'));
  let endWidth, display;
  tokens.walkDecls('--loading-logo-end-width', d => { endWidth = d.value; });
  tokens.walkDecls('--loading-logo-display', d => { display = d.value; });
  assert.equal(endWidth, `${width}px`);
  assert.equal(display, 'block');
  const css = postcss.parse(await readFile(path.join(project, 'src/components/loading/styles.css'), 'utf8'));
  css.walkRules('.bkreact-loading__logo', rule => {
    rule.walkDecls('display', d => assert.equal(d.value, 'var(--loading-logo-display)'));
  });
  assert.equal(parse({}).querySelector('.animate-spin'), null);
  assert(!css.toString().includes('.animate-spin'));
});
