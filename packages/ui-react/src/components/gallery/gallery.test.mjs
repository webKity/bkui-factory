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
  assert.equal(doc.querySelector('section').getAttribute('aria-label'), 'Media gallery');
  assert.equal(doc.querySelector('[role="group"]').getAttribute('aria-roledescription'), 'slide');
  for (const control of doc.querySelectorAll('button')) {
    assert(control.classList.contains('bk-button'));
    assert.doesNotMatch(control.getAttribute('aria-label'), /[\u3400-\u9fff]/);
  }
  for (const label of ['Previous item', 'Next item']) {
    assert(doc.querySelector(`[aria-label="${label}"] .bkreact-icon svg path`));
  }
});

test('arrows honor boundaries, looping wraps, thumbnails and dots navigate', async () => {
  const changes = [];
  await mount({ items, onIndexChange: (...args) => changes.push(args) });
  assert.equal(button('Previous item'), undefined);
  assert(button('Next item'));
  await act(() => button('Next item').click());
  assert(container.querySelector('video')); assert.deepEqual(changes[0], [1, items[1]]);
  assert(button('Previous item')); assert(button('Next item'));
  await act(() => button('Go to item 3').click());
  assert.equal(container.querySelector('video'), null); assert.equal(button('Next item'), undefined);
  assert(button('Previous item'));
  await act(() => button('View item 1').click());
  assert.equal(container.querySelector('.bkreact-gallery__media').alt, '山');
  await act(() => root.render(h(Gallery, { items, loop: true })));
  await act(() => button('Previous item').click());
  assert.equal(container.querySelector('[aria-live]').textContent, '3 / 3');
  assert(button('Previous item')); assert(button('Next item'));
  await act(() => button('Next item').click());
  assert.equal(container.querySelector('[aria-live]').textContent, '1 / 3');
  assert(button('Previous item')); assert(button('Next item'));
});

test('controlled index emits callbacks without updating until the parent changes it', async () => {
  const changes = [];
  await mount({ items, index: 0, onIndexChange: (...args) => changes.push(args) });
  await act(() => button('Next item').click());
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
  assert.equal(container.querySelector('[role="status"]').textContent, 'No media');
});

test('media errors recover when navigating to another item', async () => {
  await mount({ items });
  await act(() => container.querySelector('.bkreact-gallery__media').dispatchEvent(new Event('error')));
  assert.equal(container.querySelector('[role="status"]').textContent, 'Failed to load media');
  await act(() => button('Next item').click());
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
  assert.equal(slide.dataset.direction, 'previous');
  assert.equal(container.querySelector('.bkreact-gallery__outgoing img').getAttribute('src'), 'a.png');
  assert.equal(container.querySelectorAll('[role="group"]').length, 1);
  await act(() => endAnimation(slide.firstChild));
  await act(() => endAnimation(slide, 'unrelated'));
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => endAnimation(slide));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);

  // 切到非受控模式，从 0 向前跨边界应仍向右滑动。
  await act(() => root.render(h(Gallery, { items, loop: true })));
  await act(() => button('Previous item').click());
  slide = container.querySelector('.bkreact-gallery__slide');
  assert.equal(slide.dataset.direction, 'previous');
  await act(() => button('Next item').click());
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
  await act(() => button('Next item').click());
  assert.equal(video.isConnected, false);
  assert.equal(container.querySelector('video'), null);
  const outgoing = container.querySelector('.bkreact-gallery__outgoing');
  assert.equal(outgoing.getAttribute('aria-hidden'), 'true');
  assert.equal(outgoing.getAttribute('inert'), '');
  assert.equal(outgoing.querySelector('img').getAttribute('src'), 'b.png');
});

test('disabled motion and missing animationend both clean up the outgoing snapshot', async () => {
  motionStyle('10s', 'none');
  await mount({ items });
  await act(() => button('Next item').click());
  assert.equal(container.querySelector('[data-motion]'), null);
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
  document.querySelectorAll('[data-gallery-test-style]').forEach(node => node.remove());
  motionStyle('1ms');
  await act(() => button('Next item').click());
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => new Promise(resolve => setTimeout(resolve, 80)));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
});

test('imperative close is idempotent, removes root, restores focus and calls onClose once', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  let calls = 0, close;
  await act(async () => { close = showGallery({ items, defaultIndex: 1, className: 'custom-dialog-gallery', closeLabel: 'Close preview', onClose: () => calls++ }); closers.push(close); });
  assert(document.querySelector('[role="dialog"] .custom-dialog-gallery video'));
  assert(document.querySelector('[aria-label="Close preview"].bk-button .bkreact-icon svg'));
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
      if (method === 'button') document.querySelector('[aria-label="Close gallery"]').click();
      else key(document.querySelector('[role="dialog"]'), 'Escape');
    });
    assert.equal(document.querySelector('.bkreact-gallery-root'), null);
  }
  assert.equal(calls, 2);
});

test('labels localize gallery states, controls and media while item alt/title take precedence', async () => {
  const labels = {
    region: '画廊', video: '视频内容', previous: '上一张', next: '下一张',
    carouselRoleDescription: '轮播图', slideRoleDescription: '幻灯片', pagination: '分页', thumbnails: '缩略图',
    slide: (i, n) => `第 ${i} 项，共 ${n} 项`, dot: i => `跳转 ${i}`, thumbnail: i => `查看 ${i}`,
    counter: (i, n) => `${i}，共 ${n}`, empty: '无内容', mediaError: '加载失败',
  };
  await mount({ items, index: 1, labels });
  assert.equal(container.querySelector('section').getAttribute('aria-label'), '画廊');
  assert.equal(container.querySelector('[role="group"]').getAttribute('aria-label'), '第 2 项，共 3 项');
  assert.equal(container.querySelector('video').getAttribute('aria-label'), items[1].title);
  assert.equal(container.querySelector('[aria-live]').textContent, '2，共 3');
  assert(button('上一张')); assert(button('下一张')); assert(button('跳转 2')); assert(button('查看 2'));
  assert(container.querySelector('[aria-label="分页"]')); assert(container.querySelector('[aria-label="缩略图"]'));
  await act(() => root.render(h(Gallery, { items: [{ type: 'video', src: 'v.mp4', alt: 'Video alt', title: 'Video title' }], labels })));
  assert.equal(container.querySelector('video').getAttribute('aria-label'), 'Video alt');
  await act(() => root.render(h(Gallery, { items: [{ type: 'video', src: 'bare.mp4' }], labels })));
  assert.equal(container.querySelector('video').getAttribute('aria-label'), '视频内容');
  await act(() => container.querySelector('video').dispatchEvent(new Event('error')));
  assert.equal(container.querySelector('[role="status"]').textContent, '加载失败');
  await act(() => root.render(h(Gallery, { items: [], labels })));
  assert.equal(container.querySelector('[role="status"]').textContent, '无内容');
  assert(!container.querySelector('section').hasAttribute('tabindex'));
  await act(() => root.render(h(Gallery, { items: [], labels, emptyDescription: '优先文案' })));
  assert.equal(container.querySelector('[role="status"]').textContent, '优先文案');
});

test('current markers, image fit, below caption and aspect ratio remain consistent', async () => {
  await mount({ items, objectFit: 'cover', captionPosition: 'below', aspectRatio: '4 / 3' });
  assert.equal(container.querySelector('.bkreact-gallery__media').style.objectFit, 'cover');
  assert.equal(container.querySelector('.bkreact-gallery__viewport').style.getPropertyValue('--gallery-aspect-ratio'), '4 / 3');
  assert.equal(container.querySelector('.bkreact-gallery__viewport').getAttribute('data-dots'), '');
  assert.equal(button('Go to item 1').getAttribute('aria-current'), 'true');
  assert.equal(button('View item 1').getAttribute('aria-current'), 'true');
  assert(!button('Go to item 2').hasAttribute('aria-current'));
  assert(container.querySelector('.bkreact-gallery__viewport [aria-live="polite"]'));
  assert.equal(container.querySelectorAll('[aria-live]').length, 1);
  await act(() => button('Go to item 3').click());
  assert(!button('Go to item 1').hasAttribute('aria-current'));
  assert.equal(button('Go to item 3').getAttribute('aria-current'), 'true');
  assert.equal(button('View item 3').getAttribute('aria-current'), 'true');
});

test('empty transitions clear snapshots and do not animate or retain failed media on repopulation', async () => {
  motionStyle();
  await mount({ items });
  await act(() => button('Next item').click());
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => root.render(h(Gallery, { items: [] })));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
  assert.equal(container.querySelector('[data-motion]'), null);
  await act(() => root.render(h(Gallery, { items: [items[0]] })));
  assert(container.querySelector('img.bkreact-gallery__media'));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
});

test('controlled loop jumps infer the shortest direction and do not reuse stale navigation hints', async () => {
  motionStyle();
  await mount({ items, index: 2, loop: true });
  await act(() => button('Next item').click()); // 延迟接受请求。
  assert.equal(container.querySelector('[aria-live]').textContent, '3 / 3');
  await act(() => root.render(h(Gallery, { items, index: 0, loop: true })));
  assert.equal(container.querySelector('.bkreact-gallery__slide').dataset.direction, 'next');
  await act(() => root.render(h(Gallery, { items, index: 2, loop: true })));
  assert.equal(container.querySelector('.bkreact-gallery__slide').dataset.direction, 'previous');
  // 相同起止位置但关闭 loop 后不应复用上一轮的 next 提示。
  await act(() => root.render(h(Gallery, { items, index: 0, loop: false })));
  assert.equal(container.querySelector('.bkreact-gallery__slide').dataset.direction, 'previous');
});

test('keyboard respects RTL, modifiers, editable elements and child defaultPrevented', async () => {
  await mount({ items, defaultIndex: 1 });
  const gallery = container.querySelector('section');
  gallery.style.direction = 'rtl';
  await act(() => key(gallery, 'ArrowLeft'));
  assert.equal(container.querySelector('[aria-live]').textContent, '3 / 3');
  await act(() => key(gallery, 'ArrowRight'));
  assert.equal(container.querySelector('[aria-live]').textContent, '2 / 3');
  await act(() => gallery.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true })));
  assert.equal(container.querySelector('[aria-live]').textContent, '2 / 3');
  const control = button('Go to item 1');
  control.addEventListener('keydown', event => event.preventDefault());
  await act(() => control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })));
  assert.equal(container.querySelector('[aria-live]').textContent, '2 / 3');
  const editable = document.createElement('div'); editable.setAttribute('contenteditable', ''); gallery.append(editable);
  await act(() => key(editable, 'Home'));
  assert.equal(container.querySelector('[aria-live]').textContent, '2 / 3');
  editable.remove();
});

test('animation lists ignore none entries and reduced motion changes clear pending snapshots', async () => {
  motionStyle('10s, 1ms', 'none, bk-gallery-enter');
  await mount({ items });
  await act(() => button('Next item').click());
  assert(container.querySelector('.bkreact-gallery__outgoing'));
  await act(() => new Promise(resolve => setTimeout(resolve, 80)));
  assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
  document.querySelectorAll('[data-gallery-test-style]').forEach(node => node.remove());
  motionStyle();
  const previousMatchMedia = window.matchMedia;
  const listeners = new Set();
  const preference = { matches: false, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) };
  window.matchMedia = () => preference;
  try {
    await act(() => button('Next item').click());
    assert(container.querySelector('.bkreact-gallery__outgoing'));
    await act(() => { preference.matches = true; listeners.forEach(listener => listener()); });
    assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
    assert.equal(listeners.size, 0);
    await act(() => button('Previous item').click());
    assert.equal(container.querySelector('.bkreact-gallery__outgoing'), null);
  } finally { window.matchMedia = previousMatchMedia; }
});

test('stacked dialogs focus their close buttons and closing a lower dialog preserves the top focus', async () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  let closeFirst, closeSecond;
  await act(async () => { closeFirst = showGallery({ items, labels: { region: 'First gallery', close: 'Close first' } }); closers.push(closeFirst); });
  await act(() => new Promise(resolve => window.requestAnimationFrame(resolve)));
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Close first');
  await act(async () => { closeSecond = showGallery({ items, labels: { region: 'Second gallery', close: 'Localized close' }, closeLabel: 'Close second' }); closers.push(closeSecond); });
  await act(() => new Promise(resolve => window.requestAnimationFrame(resolve)));
  assert.equal(document.querySelectorAll('.bkreact-gallery-root').length, 2);
  const topClose = document.querySelector('[aria-label="Close second"]');
  assert.equal(document.activeElement, topClose);
  await act(async () => closeFirst());
  assert.equal(document.activeElement, topClose);
  assert.equal(document.querySelectorAll('.bkreact-gallery-root').length, 1);
  await act(async () => closeSecond());
  assert.equal(document.activeElement, trigger);
  trigger.remove();
});

test('imperative calls can be closed before mounting and do not invoke onClose more than once', async () => {
  let calls = 0;
  await act(async () => {
    const close = showGallery({ items, onClose: () => calls++ });
    close(); close(); closers.push(close);
  });
  assert.equal(document.querySelector('.bkreact-gallery-root'), null);
  assert.equal(calls, 1);
});
