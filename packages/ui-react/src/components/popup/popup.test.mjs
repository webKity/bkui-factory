import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createContext, useContext, useState, createRef } from 'react';

let api, syncFailureApi, temporary, dom, createRoot, root, container, user;
const handles = [];
before(async () => {
  temporary = await mkdtemp(fileURLToPath(new URL('../../../.popup-test-', import.meta.url)));
  const result = await build({ entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  await writeFile(`${temporary}/popup.mjs`, result.outputFiles[0].contents);
  // 强制 root.render 同步抛出，覆盖实际 React 通常不会走到的同步保护分支。
  const syncFailure = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
    plugins: [{ name: 'synchronous-render-failure', setup(build) {
      build.onResolve({ filter: /^react-dom\/client$/ }, args =>
        args.importer.endsWith('/popup/imperative.tsx')
          ? { path: 'failing-root', namespace: 'popup-test' }
          : args.namespace === 'popup-test' ? { path: args.path, external: true } : undefined);
      build.onLoad({ filter: /.*/, namespace: 'popup-test' }, () => ({
        contents: `import { createRoot as realCreateRoot } from 'react-dom/client';
          export function createRoot(container) {
            const root = realCreateRoot(container);
            return { unmount: () => root.unmount(), render() { throw new Error('sync render failed'); } };
          }`,
      }));
    } }],
  });
  await writeFile(`${temporary}/popup-sync-failure.mjs`, syncFailure.outputFiles[0].contents);
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  dom.window.PointerEvent ??= dom.window.MouseEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  api = await import(`${temporary}/popup.mjs`);
  syncFailureApi = await import(`${temporary}/popup-sync-failure.mjs`);
  ({ createRoot } = await import('react-dom/client'));
  const { userEvent } = await import('storybook/test');
  user = userEvent.setup({ document });
});
afterEach(async () => {
  await act(async () => { handles.splice(0).forEach(handle => handle.destroy()); });
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});
after(async () => { dom?.window.close(); await rm(temporary, { recursive: true, force: true }); });
async function mount(element) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(() => root.render(element));
}
const dialog = () => document.querySelector('[role="dialog"]');

test('组合 API：触发、可访问名称与描述、ref、关闭及焦点恢复', async () => {
  const ref = createRef();
  await mount(h(api.Popup, {}, h(api.PopupTrigger, {}, '打开'), h(api.PopupContent, { ref, side: 'bottom' },
    h(api.PopupHeader, {}, h(api.PopupTitle, {}, '标题'), h(api.PopupDescription, {}, '描述')),
    h(api.PopupFooter, {}, h(api.PopupClose, {}, '完成')))));
  const trigger = container.querySelector('button');
  await act(async () => { await user.click(trigger); });
  assert.equal(ref.current, dialog());
  assert.equal(dialog().dataset.side, 'bottom');
  assert.equal(document.getElementById(dialog().getAttribute('aria-labelledby')).textContent, '标题');
  assert.equal(document.getElementById(dialog().getAttribute('aria-describedby')).textContent, '描述');
  await act(async () => { await user.click([...dialog().querySelectorAll('button')].find(el => el.textContent === '完成')); });
  assert.equal(dialog(), null);
  assert.equal(document.activeElement, trigger);
});

test('受控状态等待回写；Escape 可取消', async () => {
  let changes = [];
  await mount(h(api.Popup, { open: true, onOpenChange: (open, details) => { changes.push(open); details.cancel(); } }, h(api.PopupContent, { title: '受控' })));
  await act(async () => { await user.keyboard('{Escape}'); });
  assert.deepEqual(changes, [false]);
  assert(dialog());
});

test('popup close 保留事件取消；destroy 幂等；close 在首次提交之前安全', async () => {
  let handle;
  await act(async () => { handle = api.popup({ title: '独立', onOpenChange: (_, details) => details.cancel() }); handles.push(handle); });
  await act(() => handle.close());
  assert(dialog());
  await act(async () => { handle.destroy(); handle.destroy(); });
  assert.equal(dialog(), null);
  await act(async () => { const early = api.popup({ title: '不应闪现' }); early.close(); });
  assert.equal(dialog(), null);
});

test('popup 关闭完成后清理独立 root 并调用完成回调', async () => {
  const complete = [];
  let handle;
  await act(async () => { handle = api.popup({ title: '清理', onOpenChangeComplete: open => complete.push(open) }); handles.push(handle); });
  await act(async () => handle.close());
  assert.equal(dialog(), null);
  assert(complete.includes(false));
  assert.equal(document.body.children.length, 0);
});

test('usePopup 继承 Context，每个 holder 替换旧实例，旧句柄不会关闭新弹层', async () => {
  const Context = createContext('默认');
  let create;
  function Child() { return h('span', {}, useContext(Context)); }
  function App() { const [open, holder] = api.usePopup(); create = open; return holder; }
  await mount(h(Context.Provider, { value: '应用上下文' }, h(App)));
  let old;
  await act(() => { old = create({ title: '第一个', children: h(Child) }); });
  assert(dialog().textContent.includes('应用上下文'));
  await act(() => { create({ title: '第二个' }); });
  await act(() => old.close());
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
  assert(dialog().textContent.includes('第二个'));
});

test('四个方向、隐藏关闭按钮、状态 className 回调和外部 actionsRef', async () => {
  const actionsRef = createRef();
  const ref = createRef();
  let handle;
  for (const side of ['top', 'right', 'bottom', 'left']) {
    await act(async () => { handle = api.popup({ side, title: side, ref, actionsRef, showCloseButton: false, className: state => state.open ? 'is-open' : 'is-closed' }); handles.push(handle); });
    assert.equal(ref.current, dialog());
    assert.equal(dialog().dataset.side, side);
    assert(dialog().classList.contains('is-open'));
    assert.equal(dialog().querySelector('button'), null);
    assert.equal(typeof actionsRef.current.close, 'function');
    await act(async () => actionsRef.current.close());
    assert.equal(dialog(), null);
    assert.equal(actionsRef.current, null);
  }
});

test('内容 style 是显式例外：动态 tokens 与状态回调透传；title=null 不生成快捷头部', async () => {
  let state;
  await mount(h(api.Popup, { defaultOpen: true }, h(api.PopupContent, {
    title: null, 'aria-label': '自定义标题', showCloseButton: false,
    style: next => { state = next; return { '--popup-width': '420px' }; },
  })));
  assert.equal(state.open, true);
  assert.equal(dialog().style.getPropertyValue('--popup-width'), '420px');
  assert.equal(dialog().querySelector('[data-slot="popup-header"]'), null);
  assert.equal(dialog().querySelector('button'), null);
  assert.equal(api.PopupTrigger.displayName, 'PopupTrigger');
});

test('首次打开时共享 actionsRef 可用，无需重渲染同步；handle.close 使用同一关闭流程', async () => {
  const actionsRef = createRef();
  let renders = 0;
  let changes = 0;
  function Probe() { renders += 1; return null; }
  let handle;
  await act(async () => {
    handle = api.popup({ title: '共享 actionsRef', actionsRef, children: h(Probe),
      onOpenChange: (open, details) => { assert.equal(open, false); changes += 1; details.cancel(); },
    });
    handles.push(handle);
  });
  assert.equal(renders, 1);
  assert.equal(typeof actionsRef.current.close, 'function');
  const actions = actionsRef.current;
  await act(() => handle.close());
  assert.equal(changes, 1);
  assert.equal(actionsRef.current, actions);
  assert(dialog());
  await act(async () => handle.destroy());
  assert.equal(actionsRef.current, null);
});

test('root.render 同步抛出时移除容器并保留原错误', async () => {
  const before = [...document.body.children];
  await act(async () => {
    assert.throws(() => syncFailureApi.popup({ title: '同步失败' }), /sync render failed/);
    assert.deepEqual([...document.body.children], before);
  });
});

test('异步内容渲染失败时清理 root、portal 和容器，保留错误传播', async t => {
  t.mock.method(console, 'error', () => {});
  const failure = new Error('popup content failed');
  const before = [...document.body.children];
  function Broken() { throw failure; }
  let handle;
  await assert.rejects(async () => {
    await act(async () => {
      handle = api.popup({ title: '异步失败', children: h(Broken) });
      handles.push(handle);
    });
  }, error => error === failure);
  // 错误边界安排的微任务在 React 提交结束后卸载独立 root。
  await act(async () => {});
  assert.deepEqual([...document.body.children], before);
  assert.equal(dialog(), null);
  await act(() => handle.open());
  assert.equal(dialog(), null);
});


test('已打开弹层的后续渲染失败也会清理独立 root 与已挂载 portal', async t => {
  t.mock.method(console, 'error', () => {});
  const failure = new Error('popup update failed');
  const before = [...document.body.children];
  let fail;
  function Content() {
    const [broken, setBroken] = useState(false);
    fail = () => setBroken(true);
    if (broken) throw failure;
    return h('span', {}, '已挂载内容');
  }
  const actionsRef = createRef();
  await act(async () => {
    handles.push(api.popup({ title: '更新失败', actionsRef, children: h(Content) }));
  });
  assert(dialog());
  await assert.rejects(async () => { await act(() => fail()); }, error => error === failure);
  await act(async () => {});
  assert.equal(dialog(), null);
  assert.equal(actionsRef.current, null);
  assert.deepEqual([...document.body.children], before);
});
