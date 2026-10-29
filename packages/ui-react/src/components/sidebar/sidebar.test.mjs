import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import postcss from 'postcss';

const directory = fileURLToPath(new URL('.', import.meta.url));
const rootDirectory = path.resolve(directory, '../../../../../');
let dom, temp, api, createRoot, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver'];
let mobile = false;
let mediaCreations = 0;
const mediaListeners = new Set();
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.PointerEvent ??= dom.window.MouseEvent;
  const customStyle = document.createElement('style');
  customStyle.textContent = '.custom-provider { --sidebar-width: 20rem; --sidebar-width-mobile: 21rem; --sidebar-menu-radius: 16px; }';
  document.head.append(customStyle);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.matchMedia = query => {
    if (query === '(min-width: 48rem)') mediaCreations++;
    return { get matches() { return query === '(min-width: 48rem)' ? !mobile : false; }, addEventListener: (_, callback) => mediaListeners.add(callback), removeEventListener: (_, callback) => mediaListeners.delete(callback) };
  };
  await mkdir(path.join(rootDirectory, '.test-output'), { recursive: true });
  temp = await mkdtemp(path.join(rootDirectory, '.test-output/sidebar-'));
  const result = await build({
    stdin: { contents: ['index'].map(file => `export * from './${file}';`).join('\n'), resolveDir: directory, loader: 'tsx' },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temp, 'sidebar.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  api = await import(file);
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove(); root = container = undefined;
  document.cookie = 'sidebar_state=; Max-Age=0; path=/';
  document.cookie = 'sidebar_user_set=; Max-Age=0; path=/';
  mobile = false;
});
after(async () => {
  dom?.window.close();
  for (const key of globals) delete globalThis[key];
  delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.getComputedStyle;
  if (temp) await rm(temp, { recursive: true, force: true });
});
async function render(children, props = {}) {
  if (!root) { container = document.createElement('div'); document.body.append(container); root = createRoot(container); }
  await act(() => root.render(h(api.SidebarProvider, { defaultOpen: true, defaultUserHasSet: false, ...props }, children)));
  return container;
}

test('trigger toggles desktop state and saves only user preferences', async () => {
  const changes = [];
  await render(h(api.SidebarTrigger), { onUserOpenChange: value => changes.push(value) });
  assert.equal(document.cookie, '');
  const button = container.querySelector('button');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  await act(() => button.click());
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.deepEqual(changes, [false]);
  assert.match(document.cookie, /sidebar_state=false/);
  assert.match(document.cookie, /sidebar_user_set=true/);
});

test('trigger and rail honor preventDefault and do not submit forms', async () => {
  for (const Component of [api.SidebarTrigger, api.SidebarRail]) {
    await render(h(Component, { onClick: event => event.preventDefault() }));
    const button = container.querySelector('button');
    assert.equal(button.type, 'button');
    await act(() => button.click());
    assert.equal(document.cookie, '');
  }
});

test('controlled state requests a change while retaining the supplied value', async () => {
  const changes = [];
  await render(h(api.SidebarTrigger), { open: true, onOpenChange: value => changes.push(value) });
  await act(() => container.querySelector('button').click());
  assert.deepEqual(changes, [false]);
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'true');
});

test('keyboard shortcut toggles desktop state; mobile state does not persist a desktop preference', async () => {
  await render(h(api.SidebarTrigger));
  await act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true })));
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'false');
  await act(() => root.unmount()); root = undefined; container.remove(); container = undefined;
  document.cookie = 'sidebar_state=; Max-Age=0; path=/'; document.cookie = 'sidebar_user_set=; Max-Age=0; path=/';
  mobile = true;
  await render(h(api.SidebarTrigger));
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'false');
  await act(() => container.querySelector('button').click());
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'true');
  assert.equal(document.cookie, '');
});

test('automatic changes preserve preference semantics and token overrides', async () => {
  let context;
  function Consumer() { context = api.useSidebar(); return null; }
  await render(h(Consumer), { className: 'custom-provider' });
  assert.equal(getComputedStyle(container.firstChild).getPropertyValue('--sidebar-width'), '20rem');
  assert.equal(context.portalContainer, container.firstChild);
  await act(() => context.setOpen(false));
  assert.equal(context.state, 'collapsed');
  assert.equal(document.cookie, '');
});

test('menu exposes state, render composition, actions, and native semantics', async () => {
  await render(h(api.SidebarMenu, null,
    h(api.SidebarMenuItem, null,
      h(api.SidebarMenuButton, { isActive: true }, h('svg'), h('span', null, 'Home')),
      h(api.SidebarMenuAction, { showOnHover: true, 'aria-label': 'More' })),
    h(api.SidebarMenuSub, null, h(api.SidebarMenuSubItem, null,
      h(api.SidebarMenuSubButton, { isActive: true, href: '/home' }, 'Child')))));
  const button = container.querySelector('[data-sidebar="menu-button"]');
  assert.equal(button.type, 'button');
  assert.equal(button.getAttribute('aria-current'), 'page');
  assert(button.hasAttribute('data-active'));
  assert(container.querySelector('[data-sidebar="menu-action"]').hasAttribute('data-show-on-hover'));
  assert.equal(container.querySelector('a').getAttribute('href'), '/home');
  await render(h(api.SidebarMenuButton, { render: h('a', { href: '/account' }) }, 'Account'));
  assert.equal(container.querySelector('a').getAttribute('href'), '/account');
});

test('CSS consumes only local tokens and every local reference has a definition', async () => {
  const files = await Promise.all(['design.tokens.css', 'tokens.css', 'styles.css'].map(file => readFile(path.join(directory, file), 'utf8')));
  const ast = postcss.parse(files.join('\n'));
  const names = new Set(); ast.walkDecls(decl => names.add(decl.prop));
  ast.walkDecls(decl => {
    for (const [, name] of decl.value.matchAll(/var\((--sidebar-[\w-]+)/g)) assert(names.has(name), `undefined token: ${name}`);
  });
  postcss.parse(files[2]).walkDecls(decl => {
    for (const [, name] of decl.value.matchAll(/var\((--[\w-]+)/g)) assert(name.startsWith('--sidebar-'), `nonlocal token: ${name}`);
  });
  assert.match(files[0], /\.bkreact-sidebar\s*\{/);
  assert.match(files[2], /prefers-reduced-motion/);
  assert.match(files[2], /min-width: 48rem/);
  for (const file of ['sidebar.tsx', 'sidebar-provider.tsx', 'sidebar-menu.tsx', 'sidebar-structure.tsx', 'sidebar-trigger.tsx']) {
    assert.doesNotMatch(await readFile(path.join(directory, file), 'utf8'), /group-data-|hover:bg-|duration-200|w-\(--/);
  }
});

test('desktop/sidebar variants retain data states, props and collapse geometry hooks', async () => {
  for (const side of ['left', 'right']) {
    for (const variant of ['sidebar', 'floating', 'inset']) {
      await render(h(api.Sidebar, { side, variant, collapsible: 'icon', 'aria-label': 'Navigation' }, h(api.SidebarTrigger)));
      const sidebar = container.querySelector('[data-slot="sidebar"]');
      assert.equal(sidebar.dataset.side, side);
      assert.equal(sidebar.dataset.variant, variant);
      assert.equal(sidebar.dataset.state, 'expanded');
      assert.equal(container.querySelector('[data-slot="sidebar-container"]').getAttribute('aria-label'), 'Navigation');
      await act(() => container.querySelector('button').click());
      assert.equal(sidebar.dataset.state, 'collapsed');
      assert.equal(sidebar.dataset.collapsible, 'icon');
      await act(() => container.querySelector('button').click());
    }
  }
  await render(h(api.Sidebar, { collapsible: 'none' }, 'Static'));
  assert.equal(container.querySelector('[data-collapsible="none"]').textContent, 'Static');
  assert.equal(container.querySelector('[data-slot="sidebar-gap"]'), null);
});

test('mobile uses real Popup, inherits the Provider scope, closes with Escape and restores focus', async () => {
  mobile = true;
  const { userEvent } = await import('storybook/test');
  const user = userEvent.setup({ document });
  for (const side of ['left', 'right']) {
    await render(h('div', null,
      h(api.SidebarTrigger, { 'data-testid': 'outside-trigger' }),
      h(api.Sidebar, { side, className: 'custom-sidebar' },
        h(api.SidebarTrigger, { 'data-testid': 'inside-trigger' }), h(api.SidebarMenu, null,
          h(api.SidebarMenuItem, null, h(api.SidebarMenuButton, null, 'Account'))))),
      { className: 'custom-provider' });
    const trigger = container.querySelector('[data-testid="outside-trigger"]');
    await act(async () => { await user.click(trigger); });
    const dialog = document.querySelector('[role="dialog"]');
    assert(dialog, 'real Popup mounts');
    assert.equal(dialog.dataset.side, side);
    assert.equal(dialog.dataset.mobile, 'true');
    assert(dialog.classList.contains('custom-sidebar'));
    assert(dialog.closest('.custom-provider'), 'Portal stays in the custom Provider token scope');
    assert.equal(getComputedStyle(dialog.closest('.custom-provider')).getPropertyValue('--sidebar-width-mobile'), '21rem');
    assert.equal(dialog.querySelector('[data-slot="popup-close"]'), null);
    assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Sidebar');
    assert.equal(document.getElementById(dialog.getAttribute('aria-describedby')).textContent, 'Displays the mobile sidebar.');
    await act(async () => { await user.keyboard('{Escape}'); });
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, trigger);
    assert.equal(document.cookie, '');
    await act(async () => { await user.click(trigger); });
    await act(async () => { await user.click(document.querySelector('[data-testid="inside-trigger"]')); });
    assert.equal(document.querySelector('[role="dialog"]'), null);
  }
});

test('Provider ref and Portal container point to the same wrapper', async () => {
  const { createRef } = await import('react');
  const ref = createRef();
  let context;
  function Consumer() { context = api.useSidebar(); return null; }
  await render(h(Consumer), { ref });
  assert.equal(ref.current, container.firstChild);
  assert.equal(context.portalContainer, ref.current);
});

test('mobile Popup width mapping survives either CSS import order', async () => {
  const popup = await readFile(path.join(directory, '../popup/design.tokens.css'), 'utf8');
  const sidebar = await readFile(path.join(directory, 'styles.css'), 'utf8');
  const element = document.createElement('div');
  element.className = 'bkreact-popup bkreact-popup__content bkreact-sidebar__mobile';
  element.dataset.side = 'left';
  for (const css of [popup + sidebar, sidebar + popup]) {
    const candidates = [];
    postcss.parse(css).walkRules(rule => {
      if (rule.selector.includes(':') || !element.matches(rule.selector)) return;
      rule.walkDecls('--popup-width', decl => candidates.push({
        value: decl.value, specificity: (rule.selector.match(/\.[\w-]+/g) ?? []).length,
      }));
    });
    candidates.sort((a, b) => a.specificity - b.specificity);
    assert.equal(candidates.at(-1).value, 'var(--sidebar-width-mobile)');
  }
});

test('boolean states omit false attributes and remove them when changing from true to false', async () => {
  const view = value => h(api.SidebarMenu, null,
    h(api.SidebarMenuButton, { isActive: value }, 'Main'),
    h(api.SidebarMenuAction, { showOnHover: value }, 'Action'),
    h(api.SidebarMenuSubButton, { isActive: value, href: '/child' }, 'Child'));
  for (const value of [false, true, false]) {
    await render(view(value));
    for (const selector of ['menu-button', 'menu-sub-button']) {
      const element = container.querySelector(`[data-sidebar="${selector}"]`);
      assert.equal(element.hasAttribute('data-active'), value);
      assert.equal(element.getAttribute('aria-current'), value ? 'page' : null);
    }
    assert.equal(container.querySelector('[data-sidebar="menu-action"]').hasAttribute('data-show-on-hover'), value);
  }
});

test('controlled Providers never mark or persist preferences, even with existing preference cookies', async () => {
  document.cookie = 'sidebar_state=false; path=/';
  document.cookie = 'sidebar_user_set=true; path=/';
  const existing = document.cookie;
  let context;
  const requests = [];
  function Consumer() { context = api.useSidebar(); return h(api.SidebarTrigger); }
  for (const open of [true, false]) {
    await render(h(Consumer), { open, defaultUserHasSet: true, onOpenChange: value => requests.push(value) });
    await act(() => container.querySelector('button').click());
    assert.equal(context.userHasSet, false);
    assert.equal(context.open, open);
    assert.equal(document.cookie, existing);
  }
  assert.deepEqual(requests, [false, true]);
});

test('shortcuts select the focused innermost Provider, offer opt-out, and clean up listeners', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const contexts = {};
  function Capture({ name }) { contexts[name] = api.useSidebar(); return h('button', { 'data-focus': name }, name); }
  const provider = (name, children, options = {}) => h(api.SidebarProvider, { defaultOpen: true, defaultUserHasSet: false, ...options }, h(Capture, { name }), children);
  const view = enabled => h('div', null,
    provider('outer', provider('inner', null, { keyboardShortcut: enabled })), provider('sibling'));
  await act(() => root.render(view(true)));
  const press = async () => act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true })));
  container.querySelector('[data-focus="inner"]').focus(); await press();
  assert.equal(contexts.inner.open, false); assert.equal(contexts.outer.open, true); assert.equal(contexts.sibling.open, true);
  container.querySelector('[data-focus="sibling"]').focus(); await press();
  assert.equal(contexts.sibling.open, false); assert.equal(contexts.outer.open, true);
  await act(() => root.render(view(false)));
  container.querySelector('[data-focus="inner"]').focus(); await press();
  assert.equal(contexts.inner.open, false); assert.equal(contexts.outer.open, false);
  // Outside all Providers, the first enabled Provider in DOM order owns the shortcut.
  document.activeElement.blur(); await press();
  assert.equal(contexts.outer.open, true);
  const prevented = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true }); prevented.preventDefault();
  await act(() => window.dispatchEvent(prevented)); assert.equal(contexts.outer.open, true);
  await act(() => root.unmount()); root = undefined;
  const unused = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true });
  window.dispatchEvent(unused); assert.equal(unused.defaultPrevented, false);
});

test('keyboardShortcut=false disables handling for a single Provider', async () => {
  await render(h(api.SidebarTrigger), { keyboardShortcut: false });
  const event = new KeyboardEvent('keydown', { key: 'b', metaKey: true, cancelable: true });
  await act(() => window.dispatchEvent(event));
  assert.equal(event.defaultPrevented, false);
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'true');
});

test('missing or corrupted cookies default to expanded without marking user preferences', async () => {
  for (const value of [undefined, 'corrupted', '']) {
    if (value !== undefined) {
      document.cookie = `sidebar_state=${value}; path=/`;
      document.cookie = `sidebar_user_set=${value}; path=/`;
    }
    let context;
    function Capture() { context = api.useSidebar(); return h(api.SidebarTrigger); }
    await render(h(Capture), { defaultOpen: undefined, defaultUserHasSet: undefined });
    assert.equal(context.open, true); assert.equal(context.userHasSet, false);
    await act(() => root.unmount()); root = undefined; container.remove(); container = undefined;
  }
});

test('SSR without default props hydrates against cookie preferences with no mismatch', async () => {
  const { renderToString } = await import('react-dom/server');
  const { hydrateRoot } = await import('react-dom/client');
  document.cookie = 'sidebar_state=false; path=/';
  document.cookie = 'sidebar_user_set=true; path=/';
  let context;
  function Capture() { context = api.useSidebar(); return h(api.SidebarTrigger); }
  const view = h(api.SidebarProvider, null, h(api.Sidebar, { collapsible: 'icon' }, h(Capture)));
  const markup = renderToString(view);
  assert.match(markup, /data-state="expanded"/);
  assert.match(markup, /aria-expanded="true"/);
  container = document.createElement('div'); container.innerHTML = markup; document.body.append(container);
  const errors = [];
  await act(async () => { root = hydrateRoot(container, view, { onRecoverableError: error => errors.push(error) }); });
  assert.deepEqual(errors, []);
  assert.equal(context.open, false); assert.equal(context.userHasSet, true);
  assert.equal(container.querySelector('[data-state]').getAttribute('data-state'), 'collapsed');
});

test('media query is reused, updates state, and unsubscribes on unmount', async () => {
  await render(h(api.SidebarTrigger));
  const count = mediaCreations;
  assert.equal(count, 1);
  await render(h(api.SidebarTrigger));
  assert.equal(mediaCreations, count);
  await act(() => { mobile = true; for (const callback of mediaListeners) callback(); });
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'false');
  await act(() => container.querySelector('button').click());
  assert.equal(container.querySelector('button').getAttribute('aria-expanded'), 'true');
  await act(() => root.unmount()); root = undefined;
  assert.equal(mediaListeners.size, 0);
});

test('rail is a pointer-only affordance hidden from assistive navigation', async () => {
  await render(h(api.SidebarRail));
  const rail = container.querySelector('button');
  assert.equal(rail.getAttribute('aria-hidden'), 'true');
  assert.equal(rail.tabIndex, -1);
  assert.equal(rail.getAttribute('aria-label'), null);
  await act(() => rail.click());
  assert.match(document.cookie, /sidebar_state=false/);
});

test('collapsed labels have zero width, icons cannot shrink, and :has has a CSS fallback', async () => {
  const css = postcss.parse(await readFile(path.join(directory, 'styles.css'), 'utf8'));
  let collapsedWidth, iconShrink, fallbackBackground, fallbackPadding;
  css.walkRules(rule => {
    if (rule.selector === ".bkreact-sidebar__root[data-collapsible='icon'] .bkreact-sidebar__menu-button > span:last-child:not(.bkreact-icon)") {
      rule.walkDecls('width', decl => { collapsedWidth = decl.value; });
    }
    if (rule.selector.includes('.bkreact-sidebar__menu-button svg')) {
      rule.walkDecls('flex-shrink', decl => { iconShrink = decl.value; });
    }
    if (rule.parent.type === 'atrule' && rule.parent.params === 'not selector(:has(*))') {
      rule.walkDecls('background', decl => { fallbackBackground = decl.value; });
      rule.walkDecls('padding-inline-end', decl => { fallbackPadding = decl.value; });
    }
  });
  assert.equal(collapsedWidth, 'var(--sidebar-min-size)');
  assert.equal(iconShrink, 'var(--sidebar-no-shrink)');
  assert.equal(fallbackBackground, 'var(--sidebar-bg)');
  assert.equal(fallbackPadding, 'var(--sidebar-group-label-height)');
});

test('collapsed layout removes expanded gutters and centers header, footer and menu controls', async () => {
  const css = postcss.parse(await readFile(path.join(directory, 'styles.css'), 'utf8'));
  // The DOM shape includes the span wrapper used by BKIcon, plus a separate label.
  const icon = () => h('span', { className: 'bkreact-icon' }, h('svg'));
  for (const variant of ['sidebar', 'floating', 'inset']) {
    await render(h(api.Sidebar, { variant, collapsible: 'icon' },
      h(api.SidebarHeader, null, h(api.SidebarTrigger)),
      h(api.SidebarContent, null, h(api.SidebarGroup, null,
        h(api.SidebarMenu, null,
          h(api.SidebarMenuItem, null, h(api.SidebarMenuButton, { isActive: true }, icon(), h('span', null, 'Long label'))),
          h(api.SidebarMenuItem, null, h(api.SidebarMenuButton, { 'aria-label': 'Icon only' }, icon()))))),
      h(api.SidebarFooter, null, h(api.SidebarTrigger))), { defaultOpen: false });
    function declarations(element) {
      const result = {};
      css.walkRules(rule => {
        if (rule.parent.type !== 'root' || !element.matches(rule.selector)) return;
        rule.walkDecls(decl => { result[decl.prop] = decl.value; });
      });
      return result;
    }
    for (const slot of ['header', 'footer']) {
      const style = declarations(container.querySelector(`[data-sidebar="${slot}"]`));
      assert.equal(style['margin-inline'], 'var(--sidebar-none)');
      assert.equal(style['align-items'], 'var(--sidebar-align)');
    }
    const group = declarations(container.querySelector('[data-sidebar="group"]'));
    assert.equal(group['padding-inline'], 'var(--sidebar-none)', 'expanded 16px gutters must not clip a 36px button inside a 53px sidebar');
    const menu = declarations(container.querySelector('[data-sidebar="menu"]'));
    assert.equal(menu['align-items'], 'var(--sidebar-align)');
    const item = declarations(container.querySelector('[data-sidebar="menu-item"]'));
    assert.equal(item.width, 'var(--sidebar-menu-collapsed-size)');
    assert.equal(item['max-width'], 'var(--sidebar-full-size)');
    const button = declarations(container.querySelector('[data-sidebar="menu-button"]'));
    assert.equal(button.width, 'var(--sidebar-full-size)');
    assert.equal(button['justify-content'], 'var(--sidebar-align)');
    assert.equal(button.gap, 'var(--sidebar-none)', 'hidden label must not offset the centered icon');
    const iconOnly = container.querySelector('[aria-label="Icon only"] .bkreact-icon');
    assert.equal(declarations(iconOnly).opacity, undefined, 'icon wrapper must not be treated as a label');
    assert.equal(declarations(iconOnly).width, undefined);
  }
});

test('Sidebar APIs retain className and ignore unsupported inline style from JavaScript callers', async () => {
  const props = { className: 'class-only-test', style: { color: 'red', '--sidebar-width': '999px' } };
  const content = h(api.SidebarHeader, props,
    h(api.SidebarTrigger, props), h(api.SidebarInput, props), h(api.SidebarGroupLabel, props, 'Label'),
    h(api.SidebarGroupAction, props, 'Action'));
  const menu = h(api.SidebarMenu, props, h(api.SidebarMenuItem, props,
    h(api.SidebarMenuButton, props, 'Home'), h(api.SidebarMenuAction, props, 'More'),
    h(api.SidebarMenuSub, props, h(api.SidebarMenuSubItem, props,
      h(api.SidebarMenuSubButton, { ...props, href: '/child' }, 'Child')))));
  await render(h('div', null,
    h(api.Sidebar, { ...props, collapsible: 'none' }, content,
      h(api.SidebarContent, props, h(api.SidebarGroup, props,
        h(api.SidebarGroupContent, props, menu))), h(api.SidebarSeparator, props), h(api.SidebarFooter, props), h(api.SidebarRail, props)),
    h(api.SidebarInset, props)), props);
  for (const element of container.querySelectorAll('.class-only-test')) {
    assert.equal(element.style.color, '', `${element.dataset.slot}: style must be ignored`);
    assert.equal(element.style.getPropertyValue('--sidebar-width'), '');
  }
  assert(container.querySelectorAll('.class-only-test').length >= 20);
  // Desktop and mobile branches both filter Sidebar props before forwarding to their container.
  await render(h('div', null, h(api.SidebarTrigger), h(api.Sidebar, props, h(api.SidebarTrigger))), props);
  assert.equal(container.querySelector('[data-slot="sidebar-container"]').hasAttribute('style'), false);
  await act(() => { mobile = true; for (const callback of mediaListeners) callback(); });
  await act(() => container.querySelector('button').click());
  const popup = document.querySelector('[role="dialog"]');
  assert(popup.classList.contains('class-only-test'));
  assert.equal(popup.style.color, '');
  assert.equal(popup.style.getPropertyValue('--sidebar-width'), '');
});
