import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';

let dom, temporary, Attachment, withoutStyle, createRoot, root, container;
const requests = [];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLImageElement', 'Element', 'Node', 'Image']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  const NativeImage = window.Image;
  window.Image = function Image() {
    const image = new NativeImage();
    requests.push(image);
    return image;
  };
  temporary = await mkdtemp(new URL('./.attachment-test-', import.meta.url));
  const result = await build({
    stdin: {
      contents: "export { Attachment } from './index'; export { withoutStyle } from '../utils/styles';",
      resolveDir: new URL('.', import.meta.url).pathname,
    },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const file = `${temporary}/attachment.mjs`;
  await writeFile(file, result.outputFiles[0].contents);
  ({ Attachment, withoutStyle } = await import(file));
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  container?.remove();
  requests.length = 0;
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });

async function render(props) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(h(Attachment, { loading: 'eager', ...props })));
  return container.firstElementChild;
}

test('forwards root ref and attributes, renders slots and reuses Avatar', async () => {
  const ref = createRef();
  const element = await render({ img: '/file.png', ref, id: 'file', title: '附件.pdf', desc: '2 MB',
    className: 'custom-root', imgClassName: 'custom-image', contentClassName: 'custom-content',
    titleClassName: 'custom-title', descClassName: 'custom-desc' });
  assert.equal(element, ref.current);
  assert.equal(element.id, 'file');
  assert(element.classList.contains('custom-root'));
  assert.equal(element.querySelector('.custom-title').textContent, '附件.pdf');
  assert.equal(element.querySelector('.custom-desc').textContent, '2 MB');
  assert(element.querySelector('.custom-content'));
  assert.equal(element.querySelector('.bkreact-avatar').dataset.size, 'base');
  await act(() => requests[0].dispatchEvent(new dom.window.Event('load')));
  assert.equal(element.querySelector('.custom-image').getAttribute('src'), '/file.png');
  assert.equal(element.querySelector('img').alt, '附件.pdf');
});

test('link is a native anchor and action remains independently interactive', async () => {
  let clicks = 0;
  const element = await render({ img: '/file.png', title: '附件', link: '/download',
    action: h('button', { onClick: () => clicks++ }, '移除') });
  const link = element.querySelector('a');
  const button = element.querySelector('button');
  assert.equal(link.getAttribute('href'), '/download');
  assert.equal(link.textContent.includes('附件'), true);
  assert.equal(link.contains(button), false);
  await act(() => button.click());
  assert.equal(clicks, 1);
});

test('primary image failure tries fallback once, and changing img retries primary', async () => {
  const props = { img: '/broken.png', imgFallback: '/backup.png', title: '附件' };
  const element = await render(props);
  assert.equal(requests[0].getAttribute('src'), '/broken.png');
  await act(() => requests[0].dispatchEvent(new dom.window.Event('error')));
  assert.equal(requests[1].getAttribute('src'), '/backup.png');
  await act(() => requests[1].dispatchEvent(new dom.window.Event('error')));
  assert.equal(requests.length, 2);
  assert.equal(element.querySelector('.bkreact-avatar__fallback').textContent, '附');
  await render({ ...props, img: '/new.png' });
  assert.equal(requests[2].getAttribute('src'), '/new.png');
  await act(() => requests[2].dispatchEvent(new dom.window.Event('load')));
  assert.equal(element.querySelector('img').getAttribute('src'), '/new.png');
  assert.equal(element.querySelector('.bkreact-avatar__fallback'), null);
});

test('responsive sizes stay in sync with Avatar and ignore unsupported inline style', async () => {
  const element = await render({ img: '/file.png', size: { base: 'xs', md: 'lg', xl: '2xl' }, round: true,
    style: { width: 999 }, 'data-size': 'invalid', 'data-size-sm': true });
  assert.equal(element.dataset.size, 'responsive');
  assert(element.hasAttribute('data-size-md'));
  assert(!element.hasAttribute('data-size-sm'));
  assert.equal(element.style.width, '');
  assert.equal(element.style.getPropertyValue('--attachment-md-font-size'), 'var(--attachment-size-lg-font-size)');
  const avatar = element.querySelector('.bkreact-avatar');
  assert(avatar.hasAttribute('data-round'));
  assert(avatar.hasAttribute('data-size-xl'));
  assert.equal(avatar.style.getPropertyValue('--avatar-md-size'), 'var(--avatar-size-lg-size)');
  await render({ img: '/file.png', size: 'sm' });
  assert(!element.hasAttribute('data-size-md'));
  assert(!avatar.hasAttribute('data-size-xl'));
  assert(!avatar.hasAttribute('data-round'));
});

test('custom renderer receives sizing, fallback and image props inside Avatar', async () => {
  let received;
  const size = { base: 'sm', lg: 'xl' };
  const element = await render({ size, round: true, title: '附件', imgFallback: '/backup.png',
    imgClassName: 'custom', renderImage: props => { received = props; return h('img', props.imageProps); } });
  assert.equal(received.size, size);
  assert.equal(received.round, true);
  assert.equal(received.imgFallback, '/backup.png');
  assert.equal(received.imageProps.src, '/backup.png');
  assert.equal(received.imageProps.alt, '附件');
  assert(element.querySelector('.bkreact-avatar > img.custom'));
  assert.equal(element.querySelector('.bkreact-avatar__fallback'), null);
  assert.equal(requests.length, 0);
});

test('optional slots are omitted and numeric content remains visible', async () => {
  const element = await render({ img: '/file.png' });
  assert.equal(element.querySelector('a'), null);
  assert.equal(element.querySelector('.bkreact-attachment__content'), null);
  assert.equal(element.querySelector('.bkreact-attachment__action'), null);
  await render({ img: '/file.png', title: 0, desc: 0, action: 0 });
  for (const part of ['title', 'desc', 'action']) {
    assert.equal(element.querySelector(`.bkreact-attachment__${part}`).textContent, '0');
  }
});


test('empty link renders a non-link main region', async () => {
  const element = await render({ img: '/file.png', title: '附件', link: '' });
  assert.equal(element.querySelector('a'), null);
  assert.equal(element.querySelector('.bkreact-attachment__main').tagName, 'DIV');
  assert.equal(element.querySelector('[href]'), null);
});

test('fallback preserves emoji graphemes and numeric titles', async () => {
  for (const title of ['👍附件', '👩🏽‍💻说明', 'e\u0301文档', 0]) {
    const element = await render({ img: '/broken.png', title });
    const expected = title === 0 ? '0' : title.replace(/附件|说明|文档/, '');
    assert.equal(element.querySelector('.bkreact-avatar__fallback').textContent, expected);
  }
});

test('rich text remains readable and explicit alt labels image and failed fallback', async () => {
  const title = h('strong', null, '产品说明');
  const element = await render({ img: '/file.png', title, alt: 'PDF 文件预览' });
  assert.equal(element.querySelector('strong').textContent, '产品说明');
  assert.equal(element.querySelector('[role="img"]').getAttribute('aria-label'), 'PDF 文件预览');
  await act(() => requests[0].dispatchEvent(new dom.window.Event('load')));
  assert.equal(element.querySelector('img').alt, 'PDF 文件预览');
  await render({ img: '/file.png', title, alt: '' });
  assert.equal(element.querySelector('img').alt, '');
});

test('plain title and description have native hover text', async () => {
  const element = await render({ img: '/file.png', title: '完整标题.pdf', desc: '完整描述' });
  assert.equal(element.querySelector('.bkreact-attachment__title').title, '完整标题.pdf');
  assert.equal(element.querySelector('.bkreact-attachment__desc').title, '完整描述');
});

test('custom image with link leaves action outside the anchor and receives explicit alt', async () => {
  const element = await render({ link: '/file', title: h('strong', null, '文件'), alt: '文件预览',
    action: h('button', null, '移除'), renderImage: ({ imageProps }) => h('img', imageProps) });
  assert.equal(element.querySelector('a img').alt, '文件预览');
  assert.equal(element.querySelector('a').contains(element.querySelector('button')), false);
});

test('lazy image is mounted before load, tries backup on error, and exposes fallback name', async () => {
  const element = await render({ img: '/file.png', imgFallback: '/backup.png', title: '文件', loading: undefined });
  const image = element.querySelector('img');
  assert.equal(image.loading ?? image.getAttribute('loading'), 'lazy');
  assert.equal(image.getAttribute('aria-hidden'), 'true');
  assert.equal(requests.length, 0);
  await act(() => image.dispatchEvent(new dom.window.Event('error')));
  assert.equal(image.getAttribute('src'), '/backup.png');
  assert.equal(image.getAttribute('aria-hidden'), 'true');
  await act(() => image.dispatchEvent(new dom.window.Event('error')));
  assert.equal(image.getAttribute('src'), '/backup.png');
  assert.equal(image.getAttribute('aria-hidden'), 'true');
  assert.equal(element.querySelector('[role="img"]').getAttribute('aria-label'), '文件');
  await act(() => image.dispatchEvent(new dom.window.Event('load')));
  assert.equal(element.querySelector('.bkreact-avatar__fallback'), null);
  assert.equal(image.getAttribute('aria-hidden'), null);
});


test('fixed sizes never activate responsive breakpoints on root or Avatar', async () => {
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    const element = await render({ img: '/file.png', size, 'data-size-sm': true, 'data-size-md': true });
    assert.equal(element.dataset.size, size);
    for (const node of [element, element.querySelector('.bkreact-avatar')]) {
      assert.deepEqual(node.getAttributeNames().filter(name => name.startsWith('data-size-')), []);
    }
    assert.equal(element.style.getPropertyValue('--attachment-base-gap'), `var(--attachment-size-${size}-gap)`);
  }
});

test('responsive size missing base is rejected before invalid styles reach the DOM', async () => {
  await assert.rejects(() => render({ img: '/file.png', size: { md: 'lg' } }), /响应式配置必须显式提供 base/);
  assert.equal(container.querySelector('.bkreact-attachment'), null);
});

test('identical primary and fallback URLs do not start a second preload on error', async () => {
  const element = await render({ img: '/broken.png', imgFallback: '/broken.png', title: '附件' });
  assert.equal(requests.length, 1);
  await act(() => requests[0].dispatchEvent(new dom.window.Event('error')));
  assert.equal(requests.length, 1);
  assert.equal(element.querySelector('img'), null);
  assert.equal(element.querySelector('.bkreact-avatar__fallback').textContent, '附');
});

test('changing only fallback resets failure state and retries the primary URL', async () => {
  const props = { img: '/primary.png', imgFallback: '/old-backup.png', title: '附件' };
  const element = await render(props);
  await act(() => requests[0].dispatchEvent(new dom.window.Event('error')));
  assert.equal(requests[1].getAttribute('src'), '/old-backup.png');
  await render({ ...props, imgFallback: '/new-backup.png' });
  assert.equal(requests[2].getAttribute('src'), '/primary.png');
  await act(() => requests[2].dispatchEvent(new dom.window.Event('error')));
  assert.equal(requests[3].getAttribute('src'), '/new-backup.png');
  await act(() => requests[3].dispatchEvent(new dom.window.Event('load')));
  assert.equal(element.querySelector('img').getAttribute('src'), '/new-backup.png');
});


test('withoutStyle creates a fresh object and size cleanup cannot mutate caller props', () => {
  const props = Object.freeze({ style: Object.freeze({ width: 999 }), 'data-size-sm': true, id: 'file' });
  const filtered = withoutStyle(props);
  assert.notEqual(filtered, props);
  assert.equal(Object.hasOwn(filtered, 'style'), false);
  delete filtered['data-size-sm'];
  assert.equal(props['data-size-sm'], true);
  assert.equal(props.style.width, 999);
  assert.equal(filtered.id, 'file');
});
