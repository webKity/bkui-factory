import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';

let dom, temporary, Avatar, AvatarImage, AvatarFallback, createRoot, root, container;
let getAvatarSizeStyle, avatarSizeDimensions;
let componentSizes, sizeBreakpointMinWidths, getResponsiveSizeAttributes;
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLImageElement', 'Element', 'Node', 'Image']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  temporary = await mkdtemp(new URL('./.avatar-test-', import.meta.url));
  const result = await build({
    entryPoints: [new URL('./index.tsx', import.meta.url).pathname],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const file = `${temporary}/avatar.mjs`;
  await writeFile(file, result.outputFiles[0].contents);
  ({ Avatar, AvatarImage, AvatarFallback } = await import(file));
  const sizeBuild = await build({
    stdin: {
      contents: "export * from './size'; export { componentSizes, sizeBreakpointMinWidths, getResponsiveSizeAttributes } from '../utils/size';",
      resolveDir: new URL('.', import.meta.url).pathname,
      loader: 'ts',
    },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false,
  });
  const sizeFile = `${temporary}/size.mjs`;
  await writeFile(sizeFile, sizeBuild.outputFiles[0].contents);
  ({ getAvatarSizeStyle, avatarSizeDimensions } = await import(sizeFile));
  ({ componentSizes, sizeBreakpointMinWidths, getResponsiveSizeAttributes } = await import(sizeFile));
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });

async function render(props = {}, imageProps) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(Avatar, props,
    h(AvatarFallback, { role: 'img', 'aria-label': '用户头像' }, 'BK'),
    imageProps && h(AvatarImage, imageProps),
  )));
  return container.firstElementChild;
}

function declarationsFor(ast, selector) {
  const declarations = new Map();
  let matched = false;
  ast.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    matched = true;
    rule.walkDecls(decl => declarations.set(decl.prop, decl.value));
  });
  assert(matched, `缺少选择器 ${selector}`);
  return declarations;
}

test('defaults, root ref and fallback accessibility', async () => {
  const ref = createRef();
  const avatar = await render({ ref, id: 'profile', className: state => `status-${state.imageLoadingStatus}` });
  assert.equal(ref.current, avatar);
  assert.equal(avatar.tagName, 'SPAN');
  assert.equal(avatar.id, 'profile');
  assert.equal(avatar.dataset.size, 'base');
  assert(avatar.classList.contains('bkreact-avatar'));
  assert(avatar.classList.contains('status-idle'));
  assert.equal(avatar.querySelector('[role="img"]').getAttribute('aria-label'), '用户头像');
  assert.equal(avatar.textContent, 'BK');
});

test('responsive sizes and round own their attributes and ignore inline style', async () => {
  const avatar = await render({
    size: { base: 'xs', md: 'lg', '2xl': '2xl' }, round: true,
    style: { width: 999 }, 'data-size-sm': true, 'data-size': 'forged',
    'data-size-unit': 'px', 'data-size-label': '头像',
  });
  assert(avatar.hasAttribute('data-round'));
  assert.equal(avatar.dataset.size, 'responsive');
  assert(avatar.hasAttribute('data-size-md'));
  assert(avatar.hasAttribute('data-size-2xl'));
  assert(!avatar.hasAttribute('data-size-sm'));
  assert.equal(avatar.getAttribute('data-size-unit'), 'px');
  assert.equal(avatar.getAttribute('data-size-label'), '头像');
  assert.equal(avatar.style.width, '');
  assert.equal(avatar.style.getPropertyValue('--avatar-base-size'), 'var(--avatar-size-xs-size)');
  assert.equal(avatar.style.getPropertyValue('--avatar-md-font-size'), 'var(--avatar-size-lg-font-size)');
});

test('invalid sizes fail explicitly before producing CSS references', () => {
  for (const size of [{ md: 'lg' }, {}, null, []]) {
    assert.throws(() => getAvatarSizeStyle(size), /必须显式提供 base/);
  }
  for (const size of ['huge', { base: undefined }, { base: 'base', md: 'invalid' }]) {
    assert.throws(() => getAvatarSizeStyle(size), /未知尺寸/);
  }
  assert.throws(() => getAvatarSizeStyle({ base: 'base', tablet: 'lg' }), /未知断点/);
});

test('all string sizes omit breakpoint attributes and cannot match responsive media rules', async () => {
  const css = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const avatar = await render();
  for (const size of componentSizes) {
    assert.deepEqual(getResponsiveSizeAttributes(size), {}, '字符串尺寸不能生成断点标记');
    const spoofedAttributes = Object.fromEntries(
      Object.keys(sizeBreakpointMinWidths).map(key => [`data-size-${key}`, true]),
    );
    await act(() => root.render(h(Avatar, { size, ...spoofedAttributes })));
    assert.equal(avatar.dataset.size, size);
    for (const key of Object.keys(sizeBreakpointMinWidths)) {
      assert(!avatar.hasAttribute(`data-size-${key}`), `${size} 不应输出断点属性 ${key}`);
    }
    for (const dimension of avatarSizeDimensions) {
      assert.equal(avatar.style.getPropertyValue(`--avatar-base-${dimension}`), `var(--avatar-size-${size}-${dimension})`);
    }
    // JSDOM 不计算媒体查询；证明在任何媒体宽度下，固定尺寸都无法匹配这些规则。
    css.walkAtRules('media', media => media.walkRules(rule => {
      for (const selector of rule.selectors) {
        assert(!avatar.matches(selector), `固定尺寸 ${size} 不应匹配 ${selector}`);
      }
    }));
  }
});

test('keepMounted image loads, fails and recovers with Base UI status callbacks', async () => {
  const statuses = [];
  const ref = createRef();
  await render({}, { keepMounted: true, src: '/avatar.png', alt: '用户头像', ref, onLoadingStatusChange: value => statuses.push(value) });
  const image = container.querySelector('img');
  assert.equal(ref.current, image);
  assert(image.hasAttribute('data-loading'));
  assert.equal(image.getAttribute('aria-hidden'), 'true');
  await act(() => image.dispatchEvent(new dom.window.Event('load')));
  assert.equal(container.querySelector('.bkreact-avatar__fallback'), null);
  assert.equal(image.getAttribute('alt'), '用户头像');
  await act(() => image.dispatchEvent(new dom.window.Event('error')));
  assert(image.hasAttribute('data-error'));
  assert.equal(container.querySelector('.bkreact-avatar__fallback').textContent, 'BK');
  await act(() => image.dispatchEvent(new dom.window.Event('load')));
  assert.equal(container.querySelector('.bkreact-avatar__fallback'), null);
  assert.deepEqual(statuses, ['loading', 'loaded', 'error', 'loaded']);
});

test('default image preloads offscreen and only renders after loading', async () => {
  const NativeImage = window.Image;
  const globalImageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const requests = [];
  const MockImage = function Image() {
    const image = new NativeImage();
    requests.push(image);
    return image;
  };
  window.Image = MockImage;
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: MockImage });
  try {
    const statuses = [];
    await render({}, { src: '/profile.png', alt: '头像', onLoadingStatusChange: value => statuses.push(value) });
    assert.equal(container.querySelector('img'), null);
    assert.equal(container.textContent, 'BK');
    assert.equal(requests.length, 1, 'Base UI 应使用被 mock 的 Image 构造器发起预加载');
    await act(() => requests[0].dispatchEvent(new dom.window.Event('load')));
    assert.equal(container.querySelector('img').getAttribute('src'), '/profile.png');
    assert.equal(container.querySelector('.bkreact-avatar__fallback'), null);
    assert.deepEqual(statuses, ['loading', 'loaded']);
  } finally {
    window.Image = NativeImage;
    Object.defineProperty(globalThis, 'Image', globalImageDescriptor);
  }
});

test('fallback delay, ref and custom render are forwarded', async () => {
  const ref = createRef();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(Avatar, null,
    h(AvatarFallback, { delay: 20, ref, render: h('strong'), className: state => state.imageLoadingStatus }, 'BK'),
  )));
  assert.equal(container.textContent, '');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
  assert.equal(ref.current.tagName, 'STRONG');
  assert(ref.current.classList.contains('bkreact-avatar__fallback'));
  assert(ref.current.classList.contains('idle'));
  assert.equal(ref.current.textContent, 'BK');
});

test('size token references resolve and match both CSS breakpoint dimensions', async () => {
  const css = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  const design = postcss.parse(await readFile(new URL('./design.tokens.css', import.meta.url), 'utf8'));
  const tokens = new Map();
  design.walkDecls(decl => tokens.set(decl.prop, decl.value));
  for (const size of componentSizes) {
    const style = getAvatarSizeStyle(size);
    for (const dimension of avatarSizeDimensions) {
      const variable = `--avatar-size-${size}-${dimension}`;
      assert(tokens.has(variable), `缺少设计 token ${variable}`);
      assert.equal(style[`--avatar-base-${dimension}`], `var(${variable})`);
    }
  }
  const ast = postcss.parse(css);
  for (const [key, width] of Object.entries(sizeBreakpointMinWidths)) {
    const media = ast.nodes.find(node => node.type === 'atrule' && node.params === `(min-width: ${width}rem)`);
    assert(media, `缺少断点 ${key}`);
    const declarations = declarationsFor(media, `.bkreact-avatar[data-size-${key}]`);
    const style = getAvatarSizeStyle({ base: 'xs', [key]: 'lg' });
    for (const dimension of avatarSizeDimensions) {
      const variable = `--avatar-${key}-${dimension}`;
      assert.equal(declarations.get(`--avatar-${dimension}`), `var(${variable})`);
      assert.equal(style[variable], `var(--avatar-size-lg-${dimension})`);
    }
  }
});

test('lazy image stays mounted and layering is independent of DOM order', async () => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  // 故意将图片放在 Fallback 之前；实际视口懒加载和绘制需由浏览器验证。
  await act(() => root.render(h(Avatar, null,
    h(AvatarImage, { keepMounted: true, loading: 'lazy', src: '/lazy.png', alt: '头像' }),
    h(AvatarFallback, { role: 'img', 'aria-label': '头像' }, 'BK'),
  )));
  const image = container.querySelector('img');
  assert.equal(image.getAttribute('loading'), 'lazy');
  assert(image.hasAttribute('data-loading'));
  assert.equal(container.textContent, 'BK');
  const css = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const tokens = declarationsFor(postcss.parse(await readFile(new URL('./tokens.css', import.meta.url), 'utf8')), '.bkreact-avatar');
  assert.equal(declarationsFor(css, '.bkreact-avatar__image').get('z-index'), 'var(--avatar-image-z-index)');
  assert.equal(declarationsFor(css, '.bkreact-avatar__fallback').get('z-index'), 'var(--avatar-fallback-z-index)');
  assert.equal(tokens.get('--avatar-image-z-index'), '1');
  assert.equal(tokens.get('--avatar-fallback-z-index'), '0');
  for (const state of ['loading', 'error']) {
    assert.equal(declarationsFor(css, `.bkreact-avatar__image[data-${state}]`).get('visibility'), 'var(--avatar-image-hidden-visibility)');
  }
  await act(() => image.dispatchEvent(new dom.window.Event('load')));
  assert.equal(container.querySelector('.bkreact-avatar__fallback'), null);
});
