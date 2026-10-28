import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const project = fileURLToPath(new URL('../../../', import.meta.url));
const items = [{ src: 'a.png', title: '第一张', alt: '山' }, { type: 'video', src: 'b.mp4', poster: 'b.png', title: '视频' }, { src: 'c.png', description: '第三张' }];
let temporary, Gallery, showGallery, dom, root, container, createRoot;
const closers = [];
before(async () => {
  temporary = await mkdtemp(path.join(project, '.gallery-test-'));
  const result = await build({
    stdin: { contents: "export { Gallery, showGallery } from './src/components/gallery';", resolveDir: project },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'gallery.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ Gallery, showGallery } = await import(file));
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  await act(async () => { closers.splice(0).forEach(close => close()); });
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove(); container = undefined;
  document.querySelectorAll('[data-gallery-test-style]').forEach(node => node.remove());
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });
async function mount(props) {
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(Gallery, props)));
}
const button = label => [...container.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label);
function key(target, value) { target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })); }

test('SSR supports empty state, custom classes, caption and media semantics', () => {
  const empty = renderToStaticMarkup(h(Gallery, { items: [], className: 'custom', emptyDescription: h('b', null, '没有内容') }));
  assert.match(empty, /custom/); assert.match(empty, /没有内容/); assert.doesNotMatch(empty, /<button/);
  const doc = new JSDOM(renderToStaticMarkup(h(Gallery, { items, defaultIndex: 1, captionPosition: 'below', aspectRatio: '4 / 3', objectFit: 'cover' }))).window.document;
  assert(doc.querySelector('video[controls][playsinline]'));
  assert.equal(doc.querySelector('video').getAttribute('poster'), 'b.png');
  assert.equal(doc.querySelector('video').style.objectFit, 'cover');
  assert.equal(doc.querySelector('[data-position="below"]').textContent, '视频');
  assert.equal(doc.querySelector('[aria-live]').textContent, '2 / 3');
});

test('arrows honor boundaries, looping wraps, thumbnails and dots navigate', async () => {
  const changes = [];
  await mount({ items, onIndexChange: (...args) => changes.push(args) });
  assert.equal(button('上一项'), undefined);
  assert(button('下一项'));
  await act(() => button('下一项').click());
  assert(container.querySelector('video')); assert.deepEqual(changes[0], [1, items[1]]);
  assert(button('上一项')); assert(button('下一项'));
  await act(() => button('转到第 3 项').click());
  assert.equal(container.querySelector('video'), null); assert.equal(button('下一项'), undefined);
  assert(button('上一项'));
  await act(() => button('查看第 1 项：第一张').click());
  assert.equal(container.querySelector('.bkreact-gallery__media').alt, '山');
  await act(() => root.render(h(Gallery, { items, loop: true })));
  await act(() => button('上一项').click());
  assert.equal(container.querySelector('[aria-live]').textContent, '3 / 3');
  assert(button('上一项')); assert(button('下一项'));
  await act(() => button('下一项').click());
  assert.equal(container.querySelector('[aria-live]').textContent, '1 / 3');
  assert(button('上一项')); assert(button('下一项'));
});

test('controlled index emits callbacks without updating until the parent changes it', async () => {
  const changes = [];
  await mount({ items, index: 0, onIndexChange: (...args) => changes.push(args) });
  await act(() => button('下一项').click());
  assert.deepEqual(changes, [[1, items[1]]]);
  assert.equal(container.querySelector('[aria-live]').textContent, '1 / 3');
  await act(() => root.render(h(Gallery, { items, index: 1 })));
  assert(container.querySelector('video'));
});

test('keyboard navigation skips video controls; changing items clamps invalid indexes', async () => {
  await mount({ items, defaultIndex: 99 });
  assert.equal(container.querySelector('[aria-live]').textContent, '3 / 3');
  await act(() => key(container.querySelector('section'), 'Home'));
  await act(() => key(container.querySelector('section'), 'ArrowRight'));
  await act(() => key(container.querySelector('video'), 'ArrowRight'));
  assert.equal(container.querySelector('[aria-live]').textContent, '2 / 3');
  await act(() => root.render(h(Gallery, { items: [items[0]], showDots: false, showCounter: false, showThumbnails: false })));
  assert.equal(container.querySelector('.bkreact-gallery__media').getAttribute('src'), 'a.png');
  assert.equal(container.querySelectorAll('button').length, 0);
  await act(() => root.render(h(Gallery, { items: [], index: NaN })));
  assert.equal(container.querySelector('[role="status"]').textContent, '暂无媒体');
});

test('media errors recover when navigating to another item', async () => {
  await mount({ items });
  await act(() => container.querySelector('.bkreact-gallery__media').dispatchEvent(new Event('error')));
  assert.equal(container.querySelector('[role="status"]').textContent, '媒体加载失败');
  await act(() => button('下一项').click());
  assert(container.querySelector('video'));
});

function motionStyle(duration = '10s', name = 'bk-gallery-enter') {
  const style = document.createElement('style');
  style.dataset.galleryTestStyle = '';
  style.textContent = `.bkreact-gallery__slide[data-motion] { animation-name: ${name}; animation-duration: ${duration}; animation-delay: 0s; }`;
  document.head.append(style);
}
function endAnimation(target, name = 'bk-gallery-enter') {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: name });
  target.dispatchEvent(event);
}

test('directional animation follows controlled indexes, loop boundaries and rapid navigation', async () => {
  motionStyle();
  await mount({ items, index: 0, loop: true });
  assert.equal(container.querySelector('[data-motion]'), null);
  await act(() => root.render(h(Gallery, { items, index: 2, loop: true })));
  let slide = container.querySelector('.bkreact-gallery__slide');
  assert.equal(slide.dataset.motion, 'enter');
  assert.equal(slide.dataset.direction, 'next');
  assert.equal(container.querySelector('.bkreact-gallery__outgoing img').getAttribute('src'), 'a.png');
  assert.equal(container.querySelectorAll('[role="group"]').length, 1);
  await act(() => endAnimation(slide.firstChild));
  await act(() => endAnimation(slide, 'unrelated'));
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => endAnimation(slide));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);

  // 切到非受控模式，从 0 向前跨边界应仍向右滑动。
  await act(() => root.render(h(Gallery, { items, loop: true })));
  await act(() => button('上一项').click());
  slide = container.querySelector('.bkreact-gallery__slide');
  assert.equal(slide.dataset.direction, 'previous');
  await act(() => button('下一项').click());
  assert.notEqual(container.querySelector('.bkreact-gallery__slide'), slide);
  assert.equal(container.querySelector('.bkreact-gallery__slide').dataset.direction, 'next');
  await act(() => endAnimation(slide));
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  assert.equal(container.querySelectorAll('.bkreact-gallery__outgoing').length, 1);
});

test('outgoing video is unmounted immediately and only its inert poster animates out', async () => {
  motionStyle();
  await mount({ items, defaultIndex: 1 });
  const video = container.querySelector('video');
  await act(() => button('下一项').click());
  assert.equal(video.isConnected, false);
  assert.equal(container.querySelector('video'), null);
  const outgoing = container.querySelector('.bkreact-gallery__outgoing');
  assert.equal(outgoing.getAttribute('aria-hidden'), 'true');
  assert(outgoing.hasAttribute('inert'));
  assert.equal(outgoing.querySelector('img').getAttribute('src'), 'b.png');
});

test('disabled motion and missing animationend both clean up the outgoing snapshot', async () => {
  motionStyle('10s', 'none');
  await mount({ items });
  await act(() => button('下一项').click());
  assert.equal(container.querySelector('[data-motion]'), null);
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
  document.querySelector('[data-gallery-test-style]').remove();
  motionStyle('1ms');
  await act(() => button('下一项').click());
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => new Promise(resolve => setTimeout(resolve, 80)));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
});

test('imperative close is idempotent, removes root, restores focus and calls onClose once', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  let calls = 0, close;
  await act(async () => { close = showGallery({ items, defaultIndex: 1, closeLabel: '关闭预览', onClose: () => calls++ }); closers.push(close); });
  assert(document.querySelector('[role="dialog"] video'));
  assert(document.querySelector('[aria-label="关闭预览"]'));
  await act(async () => { close(); close(); });
  assert.equal(document.querySelector('.bkreact-gallery-root'), null);
  assert.equal(calls, 1); assert.equal(document.activeElement, trigger);
  trigger.remove();
});

test('dialog close button and Escape dismiss and clean up their roots', async () => {
  let calls = 0;
  for (const method of ['button', 'escape']) {
    await act(async () => { closers.push(showGallery({ items, onClose: () => calls++ })); });
    await act(async () => {
      if (method === 'button') document.querySelector('[aria-label="关闭画廊"]').click();
      else key(document.querySelector('[role="dialog"]'), 'Escape');
    });
    assert.equal(document.querySelector('.bkreact-gallery-root'), null);
  }
  assert.equal(calls, 2);
});
