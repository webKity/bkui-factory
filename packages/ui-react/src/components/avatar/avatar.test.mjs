import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let dom, temporary, Avatar, AvatarImage, AvatarFallback, createRoot, root, container;
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
    style: { width: 999 }, 'data-size-sm': true,
  });
  assert(avatar.hasAttribute('data-round'));
  assert.equal(avatar.dataset.size, 'responsive');
  assert(avatar.hasAttribute('data-size-md'));
  assert(avatar.hasAttribute('data-size-2xl'));
  assert(!avatar.hasAttribute('data-size-sm'));
  assert.equal(avatar.style.width, '');
  assert.equal(avatar.style.getPropertyValue('--avatar-base-size'), 'var(--avatar-size-xs-size)');
  assert.equal(avatar.style.getPropertyValue('--avatar-md-font-size'), 'var(--avatar-size-lg-font-size)');
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
  const requests = [];
  window.Image = function Image() {
    const image = new NativeImage();
    requests.push(image);
    return image;
  };
  try {
    const statuses = [];
    await render({}, { src: '/profile.png', alt: '头像', onLoadingStatusChange: value => statuses.push(value) });
    assert.equal(container.querySelector('img'), null);
    assert.equal(container.textContent, 'BK');
    assert.equal(requests.length, 1);
    await act(() => requests[0].dispatchEvent(new dom.window.Event('load')));
    assert.equal(container.querySelector('img').getAttribute('src'), '/profile.png');
    assert.equal(container.querySelector('.bkreact-avatar__fallback'), null);
    assert.deepEqual(statuses, ['loading', 'loaded']);
  } finally {
    window.Image = NativeImage;
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

test('CSS breakpoint mappings and lazy loading visibility', async () => {
  const css = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  for (const [key, width] of Object.entries({ sm: 40, md: 48, lg: 64, xl: 80, '2xl': 96 })) {
    assert(css.includes(`@media (min-width: ${width}rem)`));
    assert(css.includes(`--avatar-size: var(--avatar-${key}-size)`));
  }
  assert.match(css, /\[data-error\]\s*\{\s*visibility:/);
});
