import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
let dom, dropdown, Dropdown, Button, createRoot, root, container, temporary, user, within, waitFor;
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'DocumentFragment', 'HTMLInputElement', 'MutationObserver']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  dom.window.PointerEvent = dom.window.MouseEvent;
  globalThis.PointerEvent = dom.window.PointerEvent;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const testing = await import('storybook/test');
  within = testing.within;
  waitFor = testing.waitFor;
  testing.configure({
    eventWrapper: callback => {
      const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      try { let result; act(() => { result = callback(); }); return result; }
      finally { globalThis.IS_REACT_ACT_ENVIRONMENT = previous; }
    },
    asyncWrapper: async callback => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
      try { return await callback(); } finally { globalThis.IS_REACT_ACT_ENVIRONMENT = true; }
    },
  });
  user = testing.userEvent.setup({ document });
  const output = path.join(repo, '.test-output');
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(path.join(output, 'dropdown-'));
  const result = await build({ entryPoints: [path.join(repo, 'packages/ui-react/src/components/dropdown/index.tsx')], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  const file = path.join(temporary, 'dropdown.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  dropdown = await import(file);
  ({ Dropdown } = dropdown);
  const buttonResult = await build({ entryPoints: [path.join(repo, 'packages/ui-react/src/components/button/index.tsx')], bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false });
  const buttonFile = path.join(temporary, 'button.mjs');
  await writeFile(buttonFile, buttonResult.outputFiles[0].contents);
  ({ Button } = await import(buttonFile));
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => { if (root) await act(() => root.unmount()); container?.remove(); root = null; });
after(async () => { dom?.window.close(); if (temporary) await rm(temporary, { recursive: true, force: true }); });
async function render(props = {}) {
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(Dropdown, { trigger: h('button', {}, '操作'), groups: [{ items: [{ children: '编辑' }] }], ...props })));
  return within(document.body);
}

test('复用触发元素；分组、分隔线和浮层 ref；选择后关闭并恢复焦点', async () => {
  let selected;
  const item = { children: '编辑', handler: (event, value) => { selected = [event.currentTarget, value]; } };
  const ref = createRef();
  const body = await render({ ref, className: 'custom', contentProps: { className: () => 'popup-custom' }, groups: [{ label: '文件', items: [item, { type: 'separator' }, { children: '删除', disabled: true }] }] });
  const trigger = body.getByRole('button', { name: '操作' });
  assert.equal(document.querySelectorAll('button').length, 1);
  await user.click(trigger);
  const menu = await body.findByRole('menu');
  assert(ref.current === menu);
  assert(menu.classList.contains('custom')); assert(menu.classList.contains('popup-custom'));
  assert.equal(body.getByRole('group').getAttribute('aria-labelledby'), body.getByText('文件').id);
  body.getByRole('separator');
  const action = body.getByRole('menuitem', { name: '编辑' });
  await user.click(action);
  assert(selected[0] === action); assert.equal(selected[1], item);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  await waitFor(() => assert(document.activeElement === trigger));
});

test('禁用项不执行；closeOnClick=false 保持打开；Escape 关闭', async () => {
  let count = 0;
  const body = await render({ groups: [{ items: [
    { children: '禁用', disabled: true, handler: () => count++ },
    { children: '继续', closeOnClick: false, handler: () => count++ },
  ] }] });
  const trigger = body.getByRole('button'); await user.click(trigger);
  await body.findByRole('menu');
  await user.click(body.getByRole('menuitem', { name: '禁用' })); assert.equal(count, 0);
  await user.click(body.getByRole('menuitem', { name: '继续' })); assert.equal(count, 1);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  await user.keyboard('{Escape}'); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('键盘打开、导航和 Enter 执行动作', async () => {
  let count = 0;
  const body = await render({ groups: [{ items: [{ children: '编辑', handler: () => count++ }, { children: '复制' }] }] });
  const trigger = body.getByRole('button'); trigger.focus();
  await user.keyboard('{ArrowDown}');
  await waitFor(() => assert(document.activeElement === body.getByRole('menuitem', { name: '编辑' })));
  await user.keyboard('{ArrowDown}');
  await waitFor(() => assert(document.activeElement === body.getByRole('menuitem', { name: '复制' })));
  await user.keyboard('{ArrowUp}');
  await waitFor(() => assert(document.activeElement === body.getByRole('menuitem', { name: '编辑' })));
  await user.keyboard('{Enter}'); assert.equal(count, 1);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('递归子菜单从键盘打开并执行叶子项，子菜单保留响应式尺寸', async () => {
  let count = 0;
  const body = await render({ size: { base: 'xs', lg: 'lg' }, groups: [{ items: [{ children: '移动', items: [{ children: '更多', items: [{ children: '归档', handler: () => count++ }] }] }] }] });
  body.getByRole('button').focus();
  await user.keyboard('{ArrowDown}');
  await waitFor(() => assert(document.activeElement === body.getByRole('menuitem', { name: '移动' })));
  await user.keyboard('{ArrowRight}');
  const more = await body.findByRole('menuitem', { name: '更多' });
  await waitFor(() => assert(document.activeElement === more));
  await user.keyboard('{ArrowRight}');
  const leaf = await body.findByRole('menuitem', { name: '归档' });
  const popup = leaf.closest('[role="menu"]');
  assert(popup.hasAttribute('data-size-lg'));
  assert.equal(popup.style.getPropertyValue('--dropdown-base-height'), 'var(--dropdown-size-xs-height)');
  assert.equal(popup.style.getPropertyValue('--dropdown-base-item-radius'), 'var(--dropdown-size-xs-item-radius)');
  assert.equal(popup.style.getPropertyValue('--dropdown-lg-item-radius'), 'var(--dropdown-size-lg-item-radius)');
  await user.keyboard('{Enter}'); assert.equal(count, 1);
});

test('受控菜单报告关闭请求，外部状态决定是否关闭；支持文本触发器', async () => {
  const changes = [];
  const body = await render({ trigger: '文本触发', open: true, onOpenChange: open => changes.push(open) });
  await user.click(body.getByRole('menuitem', { name: '编辑' }));
  assert.deepEqual(changes, [false]);
  assert.equal(body.getByRole('button').getAttribute('aria-expanded'), 'true');
});

test('点击外部关闭；禁用触发器不打开', async () => {
  const body = await render();
  const trigger = body.getByRole('button'); await user.click(trigger);
  await body.findByRole('menu');
  await user.click(document.body);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  await act(() => root.render(h(Dropdown, { trigger: '禁用', triggerProps: { disabled: true }, groups: [] })));
  await user.click(body.getByRole('button'));
  assert.equal(body.getByRole('button').getAttribute('aria-expanded'), 'false');
});

test('样式只消费局部 tokens；所有语义引用在 light/dark 存在', async () => {
  const dir = path.join(repo, 'packages/ui-react/src/components/dropdown');
  const styles = postcss.parse(await readFile(path.join(dir, 'styles.css'), 'utf8'));
  styles.walkDecls(d => { for (const [, token] of d.value.matchAll(/var\((--[\w-]+)/g)) assert(token.startsWith('--dropdown-'), token); });
  const design = await readFile(path.join(dir, 'design.tokens.css'), 'utf8');
  const { readdir } = await import('node:fs/promises');
  for (const theme of ['light', 'dark']) {
    const semantic = path.join(repo, 'packages/ui-react/src/components/themes', theme, 'semantic');
    const available = new Set();
    for (const file of await readdir(semantic)) {
      postcss.parse(await readFile(path.join(semantic, file), 'utf8')).walkDecls(d => available.add(d.prop));
    }
    for (const [, token] of design.matchAll(/var\((--[\w-]+)/g)) assert(available.has(token), `${theme}: ${token}`);
  }
});

// JSDOM 验证事件和 DOM 契约；碰撞定位、媒体查询及动画外观需在浏览器检查。
test('Button 组合保留触发器 ref、原事件及菜单语义；hover 打开', async () => {
  const ref = createRef();
  let clicks = 0;
  const body = await render({ hover: true, triggerProps: { delay: 0 },
    trigger: h(Button, { ref, onClick: () => clicks++ }, '更多') });
  const trigger = body.getByRole('button', { name: '更多' });
  assert(ref.current === trigger);
  assert.equal(document.querySelectorAll('button').length, 1);
  await user.hover(trigger);
  await body.findByRole('menu');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  await user.keyboard('{Escape}');
  await user.click(trigger);
  await body.findByRole('menu');
  assert.equal(clicks, 1);
});

test('组合接口完整导出；Checkbox/Radio 保留勾选语义、回调和 ref', async () => {
  for (const name of ['DropdownMenu', 'DropdownMenuPortal', 'DropdownMenuTrigger', 'DropdownMenuContent',
    'DropdownMenuGroup', 'DropdownMenuLabel', 'DropdownMenuItem', 'DropdownMenuCheckboxItem',
    'DropdownMenuRadioGroup', 'DropdownMenuRadioItem', 'DropdownMenuSeparator', 'DropdownMenuShortcut',
    'DropdownMenuSub', 'DropdownMenuSubTrigger', 'DropdownMenuSubContent']) assert(dropdown[name], name);
  const { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuItem, DropdownMenuShortcut } = dropdown;
  let checked, value;
  const ref = createRef();
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(h(DropdownMenu, { defaultOpen: true },
    h(DropdownMenuTrigger, {}, '设置'),
    h(DropdownMenuContent, {},
      h(DropdownMenuCheckboxItem, { ref, inset: true, onCheckedChange: next => checked = next }, '工具栏'),
      h(DropdownMenuRadioGroup, { defaultValue: 'time', onValueChange: next => value = next },
        h(DropdownMenuRadioItem, { value: 'time' }, '时间'),
        h(DropdownMenuRadioItem, { value: 'name' }, '名称')),
      h(DropdownMenuItem, { variant: 'destructive', 'aria-keyshortcuts': 'Meta+D' }, '删除', h(DropdownMenuShortcut, {}, '⌘ D'))))));
  const body = within(document.body);
  const checkbox = body.getByRole('menuitemcheckbox', { name: '工具栏' });
  assert(ref.current === checkbox);
  assert(checkbox.hasAttribute('data-inset'));
  await user.click(checkbox);
  assert.equal(checked, true);
  assert.equal(checkbox.getAttribute('aria-checked'), 'true');
  assert(checkbox.querySelector('[data-slot="dropdown-menu-checkbox-item-indicator"] svg'));
  await user.click(body.getByRole('menuitemradio', { name: '名称' }));
  assert.equal(value, 'name');
  assert.equal(body.getByRole('menuitemradio', { name: '名称' }).getAttribute('aria-checked'), 'true');
  assert.equal(body.getByRole('menuitem', { name: '删除' }).getAttribute('data-variant'), 'destructive');
});

test('Fragment 触发内容包在原生按钮中，保留菜单行为', async () => {
  const { Fragment } = await import('react');
  const body = await render({ trigger: h(Fragment, {}, '片段触发') });
  const trigger = body.getByRole('button', { name: '片段触发' });
  await user.click(trigger);
  await body.findByRole('menu');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
});

test('视觉快捷键不进入菜单项名称，快捷键语义由 aria-keyshortcuts 提供', async () => {
  const body = await render({ defaultOpen: true, groups: [{ items: [
    { children: '编辑', suffix: '⌘ E', 'aria-keyshortcuts': 'Meta+E' },
  ] }] });
  const item = body.getByRole('menuitem', { name: '编辑' });
  assert.equal(item.getAttribute('aria-keyshortcuts'), 'Meta+E');
  assert.equal(item.querySelector('[data-slot="dropdown-menu-shortcut"]').getAttribute('aria-hidden'), 'true');
  assert.equal(item.textContent, '编辑⌘ E');
});

test('Portal 自定义容器对根菜单和多层子菜单均生效', async () => {
  const host = document.createElement('section'); document.body.append(host);
  try {
    const body = await render({ portalProps: { container: host }, groups: [{ items: [
      { children: '移动', items: [{ children: '更多', items: [{ children: '归档' }] }] },
    ] }] });
    body.getByRole('button').focus(); await user.keyboard('{ArrowDown}');
    await waitFor(() => assert(document.activeElement === body.getByRole('menuitem', { name: '移动' })));
    assert(host.contains(body.getByRole('menu')));
    await user.keyboard('{ArrowRight}');
    const more = await body.findByRole('menuitem', { name: '更多' });
    await waitFor(() => assert(document.activeElement === more));
    await user.keyboard('{ArrowRight}');
    const leaf = await body.findByRole('menuitem', { name: '归档' });
    assert(host.contains(leaf));
    assert.equal(host.querySelectorAll('[role="menu"]').length, 3);
  } finally { host.remove(); }
});

test('组合式 Content 的 portalProps 生效；替换 Trigger 元素时 ref 指向真实节点并执行 cleanup', async () => {
  const { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } = dropdown;
  const host = document.createElement('section'); document.body.append(host);
  let triggerNode, cleaned = false;
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  try {
    await act(() => root.render(h(DropdownMenu, {},
      h(DropdownMenuTrigger, {
        nativeButton: false, render: h('a', { href: '#settings' }),
        ref: node => { triggerNode = node; return () => { cleaned = true; }; },
      }, '设置'),
      h(DropdownMenuContent, { portalProps: { container: host } }, h(DropdownMenuItem, {}, '编辑')))));
    assert.equal(triggerNode.tagName, 'A');
    assert(triggerNode === container.querySelector('a'));
    triggerNode.focus(); await user.keyboard('{ArrowDown}');
    await within(host).findByRole('menu');
    assert.equal(cleaned, false);
    await act(() => root.unmount()); root = null;
    assert.equal(cleaned, true);
  } finally { host.remove(); }
});

test('仅 base 尺寸不生成断点标记，md 断点引用合法的 lg 尺寸', async () => {
  const body = await render({ defaultOpen: true, size: { base: 'sm' } });
  let menu = body.getByRole('menu');
  for (const scope of ['sm', 'md', 'lg', 'xl', '2xl']) assert.equal(menu.hasAttribute(`data-size-${scope}`), false);
  assert.equal(menu.style.getPropertyValue('--dropdown-base-height'), 'var(--dropdown-size-sm-height)');
  await act(() => root.render(h(Dropdown, { trigger: '操作', groups: [], defaultOpen: true, size: { base: 'sm', md: 'lg' } })));
  menu = body.getByRole('menu');
  assert(menu.hasAttribute('data-size-md')); assert(!menu.hasAttribute('data-size-lg'));
  assert.equal(menu.style.getPropertyValue('--dropdown-md-height'), 'var(--dropdown-size-lg-height)');
});
