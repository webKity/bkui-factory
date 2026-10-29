import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, memo, useContext, StrictMode } from 'react';
import { BehaviorSubject, of } from 'rxjs';

let components, InstallerService, createRoot, temporary, windowDom, root, container;
const savedGlobals = new Map();

before(async () => {
  windowDom = new JSDOM('<!doctype html><html><body></body></html>');
  for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : windowDom.window[key],
    });
  }
  ({ createRoot } = await import('react-dom/client'));
  temporary = await mkdtemp(new URL('../../../../../.test-output/dom-engine-', import.meta.url));
  const output = await build({
    stdin: {
      contents: "export * from './dom.engine'; export * from './installer';",
      resolveDir: new URL('.', import.meta.url).pathname,
      loader: 'ts',
    },
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    write: false,
  });
  const file = `${temporary}/engine.mjs`;
  await writeFile(file, output.outputFiles[0].contents);
  components = await import(file);
  ({ InstallerService } = components);
});

afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});

after(async () => {
  windowDom?.window.close();
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

const node = (uid, tagName = 'text', extra = {}) => ({ uid, tagName, ...extra });
const renderer = label => ({ tagName: 'text', render: () => h('span', {}, label) });
const pack = (name, layer, renderers, extra = {}) => ({ name, layer, renderers, ...extra });
const service = (doms$, extra = {}) => ({ doms$, set() {}, get() {}, ...extra });

async function render(props, strict = false) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  const element = h(components.DomEngine, props);
  await act(() => root.render(strict ? h(StrictMode, {}, element) : element));
}

test('层级覆盖、同层后装优先、targetType 与 renderer match 同时满足', () => {
  const registry = new InstallerService();
  const base = renderer('base'), custom = renderer('custom'), domain = renderer('domain');
  registry.installMany([
    pack('custom', 'custom', [custom]),
    pack('core', 'core', [base]),
    pack('domain', 'domain', [domain]),
  ]);
  assert.equal(registry.get('text').render, custom.render);
  const conditional = { ...renderer('conditional'), match: props => props.dom.uid === 'hit' };
  registry.install(pack('conditional', 'custom', [conditional], { targetType: 'grid' }));
  const props = { dom: node('hit'), service: { targetType: 'grid' } };
  assert.equal(registry.get('text', props).render, conditional.render);
  assert.equal(registry.get('text', { ...props, service: { targetType: 'other' } }).render, custom.render);
  assert.equal(registry.get('text', { ...props, dom: node('miss') }).render, custom.render);
  assert.equal(registry.get('text').render, custom.render);
  assert.equal(registry.has('text'), true);
  assert.equal(registry.has('missing'), false);
  assert.equal(registry.list().length, 4);
  assert.equal(registry.listPacks().length, 4);
  assert.equal('renderers' in registry.listPacks()[0], false);
});

test('批量安装完成后通知，重复引用不重复注册或发布，快照稳定', () => {
  const registry = new InstallerService();
  const a = pack('same-name', 'core', [renderer('a')]);
  const b = pack('same-name', 'core', [renderer('b')]);
  const snapshots = [];
  const unsubscribe = registry.subscribe(() => snapshots.push(registry.get('text')));
  registry.installMany([a, a, b]);
  const snapshot = registry.getSnapshot();
  registry.install(a);
  assert.equal(registry.getSnapshot(), snapshot);
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1].render, b.renderers[0].render);
  assert.equal(registry.list().length, 2);
  unsubscribe();
});

test('非法 pack 和空 tagName 在修改注册表前报错', () => {
  const registry = new InstallerService();
  const valid = pack('valid', 'core', [renderer('valid')]);
  for (const invalid of [null, {}, { ...valid, renderers: null }, { ...valid, layer: 'invalid' },
    { ...valid, renderers: [{ ...renderer('bad'), tagName: '' }] }]) {
    assert.throws(() => registry.installMany([valid, invalid]), TypeError);
    assert.equal(registry.list().length, 0);
    assert.equal(registry.packs.length, 0);
  }
});

test('StrictMode 下单次发射的 doms 可显示，后续安装无需 doms 再发射', async () => {
  const model = service(of([node('one')]));
  const base = pack('base', 'core', [renderer('base')]);
  let registry;
  function Capture() {
    registry = useContext(components.DomEngineContext).installerService;
    return null;
  }
  const props = { service: model, packs: [base], children: h(Capture) };
  await render(props, true);
  assert.equal(container.textContent, 'base');
  await render({ ...props, packs: [base] }, true);
  assert.equal(registry.packs.length, 1);
  await act(() => registry.install(pack('override', 'custom', [renderer('override')])));
  assert.equal(container.textContent, 'override');
  assert.equal(registry.packs.length, 2);
});

test('packs prop 增加后重新渲染，实例间注册表隔离', async () => {
  const model = service(of([node('one')]));
  const base = pack('base', 'core', [renderer('base')]);
  await render({ service: model });
  assert.equal(container.textContent, '');
  await render({ service: model, packs: [base] });
  assert.equal(container.textContent, 'base');
  await act(() => root.render(h('div', {},
    h(components.DomEngine, { service: model, packs: [base] }),
    h(components.DomEngine, { service: model }),
  )));
  assert.equal(container.textContent, 'base');
});

test('切换 service 会取消旧流并订阅新流，默认 change 指向当前 service', async () => {
  const oldStream = new BehaviorSubject([node('old')]);
  const newStream = new BehaviorSubject([node('new')]);
  const changes = [];
  const oldService = service(oldStream);
  const newService = service(newStream, { set: (...args) => changes.push(args) });
  const button = { tagName: 'text', render: ({ dom, onChange }) => h('button', {
    onClick: () => onChange(dom.uid, 42),
  }, dom.uid) };
  const packs = [pack('buttons', 'core', [button])];
  await render({ service: oldService, packs });
  await render({ service: newService, packs });
  assert.equal(container.textContent, 'new');
  assert.equal(oldStream.observed, false);
  await act(() => oldStream.next([node('stale')]));
  assert.equal(container.textContent, 'new');
  await act(() => container.querySelector('button').click());
  assert.deepEqual(changes, [['new', 42, 'value']]);
});

test('递归覆盖生效，重复 uid 无 key 警告，稳定 props 不重复渲染', async () => {
  const warnings = [], originalError = console.error;
  console.error = (...args) => warnings.push(args.join(' '));
  try {
    let renders = 0;
    const Leaf = memo(({ I18n, dom }) => {
      renders += 1;
      return h('span', {}, `${I18n}:${dom.uid}`);
    });
    const Branch = ({ dom, renderNode }) => h('div', {}, renderNode(dom.nodes, { I18n: 'child' }));
    const packs = [pack('tree', 'core', [
      { tagName: 'branch', render: Branch }, { tagName: 'text', render: Leaf },
    ])];
    const model = service(of([
      node('same', 'branch', { nodes: [node('same'), node('same'), node('')] }),
      node('same'),
    ]));
    const props = { service: model, I18n: 'root', packs };
    await render(props);
    assert.equal(container.textContent, 'child:samechild:samechild:root:same');
    const count = renders;
    await render({ ...props, packs: [...packs] });
    assert.equal(renders, count);
    assert.deepEqual(warnings, []);
  } finally {
    console.error = originalError;
  }
});

test('一棵递归树只订阅一次注册表，clear 清空显示并允许重新安装', async () => {
  let registry;
  function Capture() {
    registry = useContext(components.DomEngineContext).installerService;
    return null;
  }
  const branch = { tagName: 'branch', render: ({ dom, renderNode }) => h('div', {}, renderNode(dom.nodes)) };
  const base = pack('tree', 'core', [branch, renderer('leaf')]);
  const model = service(of([node('root', 'branch', {
    nodes: Array.from({ length: 100 }, (_, index) => node(String(index))),
  })]));
  await render({ service: model, packs: [base], children: h(Capture) }, true);
  assert.equal(container.querySelectorAll('span').length, 100);
  // 白盒检查实际 RxJS 订阅数，不随节点数量增长。
  assert.equal(registry._packs$.observers.length, 1);
  const version = registry.getSnapshot();
  await act(() => registry.clear());
  assert.equal(container.textContent, '');
  assert.deepEqual(registry.packs, []);
  assert.deepEqual(registry.list(), []);
  assert.deepEqual(registry.listPacks(), []);
  assert.equal(registry.has('text'), false);
  assert.equal(registry.getSnapshot(), version + 1);
  registry.clear();
  assert.equal(registry.getSnapshot(), version + 1);
  await act(() => registry.install(base));
  assert.equal(container.querySelectorAll('span').length, 100);
  assert.equal(registry.getSnapshot(), version + 2);
  await act(() => root.unmount());
  root = undefined;
  assert.equal(registry._packs$.observers.length, 0);
});

test('异步 service 未发射时保留节点及原服务，发射后切换，空数组可清空', async () => {
  const oldStream = new BehaviorSubject([node('old')]);
  const newStream = new BehaviorSubject([node('new')]);
  const calls = [];
  const oldService = service(oldStream, { set: (...args) => calls.push(['old', ...args]) });
  // Subject 没有初始发射，模拟尚未返回列表的异步服务。
  const { Subject } = await import('rxjs');
  const delayed = new Subject();
  const newService = service(delayed, { set: (...args) => calls.push(['new', ...args]) });
  const packs = [pack('buttons', 'core', [{
    tagName: 'text',
    render: ({ dom, onChange }) => h('button', { onClick: () => onChange(dom.uid, 1) }, dom.uid),
  }])];
  await render({ service: oldService, packs });
  await render({ service: newService, packs });
  assert.equal(oldStream.observed, false);
  assert.equal(container.textContent, 'old');
  await act(() => container.querySelector('button').click());
  assert.deepEqual(calls, [['old', 'old', 1, 'value']]);
  await act(() => delayed.next(newStream.value));
  assert.equal(container.textContent, 'new');
  await act(() => container.querySelector('button').click());
  assert.deepEqual(calls[1], ['new', 'new', 1, 'value']);
  await act(() => delayed.next([]));
  assert.equal(container.textContent, '');
});

test('递归 null 覆盖按约定继承，扩展参数改变会传播到 memo 子节点', async () => {
  let childProps;
  const Leaf = memo(props => {
    childProps = props;
    return h('span', {}, `${props.I18n}:${props.extra.label}`);
  });
  const Branch = ({ dom, renderNode }) => renderNode(dom.nodes, {
    I18n: null, service: undefined, onChange: undefined,
  });
  const packs = [pack('tree', 'core', [
    { tagName: 'branch', render: Branch }, { tagName: 'text', render: Leaf },
  ])];
  const model = service(of([node('parent', 'branch', { nodes: [node('child')] })]));
  const props = { service: model, packs, I18n: 'parent', extra: { label: 'first' } };
  await render(props);
  assert.equal(container.textContent, 'parent:first');
  assert.equal(childProps.service, model);
  assert.equal(typeof childProps.onChange, 'function');
  await render({ ...props, extra: { label: 'second' } });
  assert.equal(container.textContent, 'parent:second');
});

test('无关 pack 安装不会重新调用 renderer，renderNode 引用保持稳定', async () => {
  let registry, renderNodeReference, renders = 0;
  function Capture() {
    registry = components.useInstallerService();
    return null;
  }
  const branch = {
    tagName: 'branch',
    render: ({ dom, renderNode }) => {
      renders += 1;
      renderNodeReference = renderNode;
      return h('div', {}, renderNode(dom.nodes));
    },
  };
  const base = pack('base', 'core', [branch, renderer('leaf')]);
  const model = service(of([node('branch', 'branch', { nodes: [node('child')] })]));
  await render({ service: model, packs: [base], children: h(Capture) });
  const before = renders, reference = renderNodeReference;
  await act(() => registry.install(pack('unrelated', 'custom', [{ ...renderer('other'), tagName: 'other' }])));
  assert.equal(renders, before);
  assert.equal(renderNodeReference, reference);
  await act(() => registry.install(pack('override', 'custom', [renderer('updated child')])));
  assert.equal(container.textContent, 'updated child');
  assert.equal(renders, before);
});

test('定义构造 getter 抛错时整批不修改注册表、版本或通知', () => {
  const registry = new InstallerService();
  const existing = pack('existing', 'core', [renderer('existing')]);
  registry.install(existing);
  const before = registry.getSnapshot();
  let notifications = 0;
  const unsubscribe = registry.subscribe(() => notifications += 1);
  const failure = new Error('definition getter failed');
  const broken = { ...renderer('broken') };
  Object.defineProperty(broken, 'description', { enumerable: true, get() { throw failure; } });
  const valid = pack('valid', 'custom', [renderer('valid')]);
  assert.throws(() => registry.installMany([valid, pack('broken', 'core', [broken])]), error => error === failure);
  assert.equal(registry.getSnapshot(), before);
  assert.equal(notifications, 1);
  assert.deepEqual(registry.packs, [existing]);
  assert.equal(registry.list().length, 1);
  assert.equal(registry.get('text').render, existing.renderers[0].render);
  registry.install(valid);
  assert.equal(registry.packs.length, 2);
  unsubscribe();
});

test('空 pack 合法，仅登记元数据，重复安装不通知，可清空', () => {
  const registry = new InstallerService();
  const empty = pack('empty', 'core', []);
  registry.install(empty);
  assert.equal(registry.getSnapshot(), 1);
  assert.deepEqual(registry.list(), []);
  assert.deepEqual(registry.listPacks(), [{ name: 'empty', layer: 'core' }]);
  assert.equal(registry.has('text'), false);
  registry.install(empty);
  assert.equal(registry.getSnapshot(), 1);
  registry.clear();
  assert.equal(registry.getSnapshot(), 2);
  assert.deepEqual(registry.packs, []);
});

test('useInstallerService 在 Provider 外报告明确错误', async () => {
  const { renderToString } = await import('react-dom/server');
  function Consumer() {
    components.useInstallerService();
    return null;
  }
  assert.throws(() => renderToString(h(Consumer)), /useInstallerService must be used within <DomEngine \/>/);
});
