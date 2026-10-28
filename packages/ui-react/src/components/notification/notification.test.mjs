import assert from 'node:assert/strict';
import { before, beforeEach, after, afterEach, mock, test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

const project = fileURLToPath(new URL('../../../', import.meta.url));
let temporary, DEFAULT_NOTIFICATION_DURATION, Notification, NotificationProvider, useNotification, dom, root, container, createRoot, api;
before(async () => {
  temporary = await mkdtemp(path.join(project, '.notification-test-'));
  const result = await build({
    stdin: { contents: "export * from './src/components/notification';", resolveDir: project },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'notification.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ DEFAULT_NOTIFICATION_DURATION, Notification, NotificationProvider, useNotification } = await import(file));
  dom = new JSDOM('<!doctype html><html><head><style>.bkreact-notification { animation-name: none; animation-duration: 0s; animation-delay: 0s; }</style></head><body></body></html>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
});
beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100000 }));
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined; container?.remove(); container = undefined;
  mock.timers.reset();
});
after(async () => { dom.window.close(); await rm(temporary, { recursive: true, force: true }); });
function Consumer() { api = useNotification(); return h('span', null, 'app'); }
async function mount() {
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(NotificationProvider, null, h(Consumer))));
}
const cards = () => [...document.querySelectorAll('.bkreact-notification')];
const advance = ms => act(() => mock.timers.tick(ms));

test('SSR renders all slots, intent semantics and provider children without a portal', () => {
  const markup = renderToStaticMarkup(h(Notification, { item: { id: 'one', title: '失败', message: '请重试', intent: 'danger', children: h('b', null, '详情'), actions: [{ label: '重试', intent: 'brand', variant: 'outline' }] }, onClose() {} }));
  const doc = new JSDOM(markup).window.document;
  assert(doc.querySelector('[role="alert"][data-intent="danger"]'));
  assert.equal(doc.querySelector('.bkreact-notification__title').textContent, '失败');
  assert.equal(doc.querySelector('.bkreact-notification__message').textContent, '请重试');
  assert.equal(doc.querySelector('.bkreact-notification__body b').textContent, '详情');
  assert(doc.querySelector('.bk-button[data-intent="brand"][data-variant="outline"]'));
  assert(doc.querySelector('[aria-label="Close notification"]'));
  assert.equal(renderToStaticMarkup(h(NotificationProvider, null, 'app')), 'app');
});

test('provider stacks unique IDs in each corner, preserves context and closes by ID', async () => {
  await mount();
  const context = api;
  const ids = [];
  await act(() => {
    for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      ids.push(api.showNotification({ position, message: position, duration: 0 }));
    }
    ids.push(api.showNotification({ message: 'default', duration: 0 }));
  });
  assert.equal(new Set(ids).size, 5);
  assert.equal(api, context);
  assert.equal(container.querySelector('.bkreact-notification'), null);
  assert.equal(document.querySelector('[data-position="top-right"]').children.length, 2);
  assert.equal(cards().length, 5);
  await act(() => { api.closeNotification(ids[0]); api.closeNotification(ids[0]); api.closeNotification('missing'); });
  await advance(0);
  assert.equal(cards().length, 4);
});

test('duration expires, persistent items remain, actions and close button work', async () => {
  await mount();
  let clicks = 0;
  await act(() => {
    api.showNotification({ message: 'temporary', duration: 20 });
    api.showNotification({ message: 'persistent', duration: 0, actions: [{ label: 'Retry', onClick: () => clicks++ }] });
  });
  await act(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Retry').click());
  assert.equal(clicks, 1);
  await advance(19);
  assert.equal(cards().length, 2);
  await advance(1);
  assert(cards().some(card => card.dataset.state === 'closing'));
  await advance(0);
  assert.equal(cards().length, 1);
  assert.match(cards()[0].textContent, /persistent/);
  await act(() => cards()[0].querySelector('[aria-label="Close notification"]').click());
  await advance(0);
  assert.equal(cards().length, 0);
});

test('closing waits for computed motion and provider unmount removes portals and timers', async () => {
  await mount();
  const style = document.createElement('style');
  style.textContent = '.bkreact-notification[data-state="closing"] { animation-name: bk-notification-exit; animation-duration: 0.04s; animation-delay: 0s; }';
  document.head.append(style);
  try {
    let id;
    await act(() => { id = api.showNotification({ duration: 10000, actions: [{ label: 'Action' }] }); });
    await act(() => api.closeNotification(id));
    assert.equal(cards()[0].dataset.state, 'closing');
    assert(cards()[0].querySelector('button').disabled);
    await advance(39);
    assert.equal(cards().length, 1);
    await advance(1);
    assert.equal(cards().length, 0);
    await act(() => { api.showNotification({ duration: 10000 }); });
    await act(() => root.unmount()); root = undefined;
    assert.equal(document.querySelector('.bkreact-notification-viewport'), null);
    await advance(10000);
    assert.equal(document.querySelector('.bkreact-notification-viewport'), null);
  } finally { style.remove(); }
});

test('hook outside a provider has an actionable error', () => {
  assert.throws(() => renderToStaticMarkup(h(Consumer)), /within a NotificationProvider/);
});

test('each intent renders a leading icon; success, warning and danger use distinct symbols', () => {
  const symbols = new Map();
  for (const intent of ['normal', 'brand', 'success', 'warning', 'danger']) {
    const doc = new JSDOM(renderToStaticMarkup(h(Notification, { item: { id: intent, intent }, onClose() {} }))).window.document;
    const icon = doc.querySelector('.bkreact-notification__icon[aria-hidden="true"] svg');
    assert(icon, `missing icon for ${intent}`);
    symbols.set(intent, [...icon.querySelectorAll('path')].map(path => path.getAttribute('d')).join('|'));
    assert.equal(doc.querySelector('.bkreact-notification__progress'), null);
  }
  assert.equal(new Set(['normal', 'success', 'warning', 'danger'].map(intent => symbols.get(intent))).size, 4);
});

test('countdown uses the close duration, persists across new notifications, and is absent for persistent items', async () => {
  await mount();
  await act(() => {
    api.showNotification({ message: 'default duration' });
    api.showNotification({ message: 'custom duration', duration: 10000 });
    for (const duration of [0, -1, Infinity, NaN]) api.showNotification({ message: 'persistent', duration });
  });
  const defaultCard = cards().find(card => card.textContent.includes('default duration'));
  const customCard = cards().find(card => card.textContent.includes('custom duration'));
  const persistentCards = cards().filter(card => card.textContent.includes('persistent'));
  const progress = defaultCard.querySelector('.bkreact-notification__progress-fill');
  const delay = progress.style.getPropertyValue('--notification-countdown-delay');
  assert.equal(progress.style.getPropertyValue('--notification-countdown-duration'), `${DEFAULT_NOTIFICATION_DURATION}ms`);
  assert.equal(customCard.querySelector('.bkreact-notification__progress-fill').style.getPropertyValue('--notification-countdown-duration'), '10000ms');
  assert(persistentCards.every(card => !card.querySelector('.bkreact-notification__progress')));
  await advance(15);
  await act(() => { api.showNotification({ message: 'another', duration: 0 }); });
  assert.equal(defaultCard.querySelector('.bkreact-notification__progress-fill'), progress);
  assert.equal(progress.style.getPropertyValue('--notification-countdown-delay'), delay);
});

test('progress compensates for time elapsed before rendering', () => {
  const now = Date.now();
  const doc = new JSDOM(renderToStaticMarkup(h(Notification, {
    item: { id: 'delayed', duration: 5000, expiresAt: now + 3000 }, onClose() {},
  }))).window.document;
  const progress = doc.querySelector('.bkreact-notification__progress-fill');
  const delay = parseFloat(progress.style.getPropertyValue('--notification-countdown-delay'));
  assert.equal(delay, -2000);
});


test('bottom countdown resolves its animation on the element owning the runtime duration', async () => {
  const tokens = postcss.parse(await readFile(new URL('./tokens.css', import.meta.url), 'utf8'));
  const styles = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const declarations = (tree, selector) => {
    const result = {};
    tree.walkRules(rule => {
      if (rule.selector === selector) rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
    });
    return result;
  };
  const fill = '.bkreact-notification__progress-fill';
  const animation = declarations(tokens, fill)['--notification-countdown-animation'];
  // 自定义属性在声明元素上解析：动画必须与行内 duration / delay 在同一元素。
  assert.match(animation, /var\(--notification-countdown-duration\)/);
  assert.match(animation, /var\(--notification-countdown-delay\)/);
  assert.match(animation, /linear/);
  assert.equal(declarations(styles, fill).animation, 'var(--notification-countdown-animation)');
  assert.equal(declarations(styles, fill)['transform-origin'], 'left');
  assert.equal(declarations(styles, '.bkreact-notification__progress').inset, 'auto 0 0');
  assert.equal(declarations(styles, '.bkreact-notification')['border-inline-start-color'], undefined);
  let countdown;
  styles.walkAtRules('keyframes', rule => { if (rule.params === 'bk-notification-countdown') countdown = rule; });
  assert(countdown);
  assert.equal(declarations(countdown, 'from').transform, 'scaleX(0)');
  assert.equal(declarations(countdown, 'to').transform, 'scaleX(1)');
});


test('dismiss requests and completed removal use separate callbacks', async () => {
  const requested = [], removed = [];
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  const props = { item: { id: 'controlled', closeLabel: '关闭通知' },
    onClose: id => requested.push(id), onRemoved: id => removed.push(id) };
  await act(() => root.render(h(Notification, props)));
  await act(() => container.querySelector('[aria-label="关闭通知"]').click());
  assert.deepEqual(requested, ['controlled']);
  assert.deepEqual(removed, []);
  await act(() => root.render(h(Notification, { ...props, item: { ...props.item, closing: true } })));
  await advance(0);
  assert.deepEqual(requested, ['controlled']);
  assert.deepEqual(removed, ['controlled']);
  // 无关重渲染不会再次触发移除，回调只执行一次。
  await act(() => root.render(h(Notification, { ...props, item: { ...props.item, closing: true } })));
  await advance(0);
  assert.deepEqual(removed, ['controlled']);
});

test('new notifications are nearest their selected corner', async () => {
  await mount();
  await act(() => {
    for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      api.showNotification({ position, message: 'old', duration: 0 });
      api.showNotification({ position, message: 'new', duration: 0 });
    }
  });
  for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    const viewport = document.querySelector(`[data-position="${position}"]`);
    const nearest = position.startsWith('top') ? viewport.firstElementChild : viewport.lastElementChild;
    assert.equal(nearest.querySelector('.bkreact-notification__message').textContent, 'new');
  }
});
