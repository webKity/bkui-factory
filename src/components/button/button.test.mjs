import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
let Button, createRoot, dom, temporary, stories;
let root, container;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'HTMLAnchorElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { configure } = await import('storybook/test');
  configure({
    eventWrapper(callback) {
      let result;
      const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      try { act(() => { result = callback(); }); }
      finally { globalThis.IS_REACT_ACT_ENVIRONMENT = previous; }
      return result;
    },
    asyncWrapper: async callback => {
      const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
      try { return await callback(); }
      finally { globalThis.IS_REACT_ACT_ENVIRONMENT = previous; }
    },
  });
  const output = path.join(projectRoot, '.test-output');
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(path.join(output, 'button-'));
  const result = await build({
    entryPoints: [path.join(projectRoot, 'src/components/button/index.tsx')],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const file = path.join(temporary, 'button.mjs');
  await writeFile(file, result.outputFiles[0].contents);
  ({ Button } = await import(file));
  ({ createRoot } = await import('react-dom/client'));
  const storyBuild = await build({
    entryPoints: [path.join(projectRoot, 'src/components/button/Button.stories.tsx')],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const storiesFile = path.join(temporary, 'button-stories.mjs');
  await writeFile(storiesFile, storyBuild.outputFiles[0].contents);
  const { composeStories } = await import('@storybook/react-vite');
  stories = composeStories(await import(storiesFile));
});

afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});
after(async () => {
  dom?.window.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

async function render(element) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(element));
  return container.querySelector('.bkreact-button');
}

test('原生按钮默认不提交表单；显式 submit、原生属性和 ref 正常', async () => {
  let clicks = 0, submits = 0;
  const ref = createRef();
  const form = type => h('form', { onSubmit: event => { event.preventDefault(); submits++; } },
    h(Button, { ref, type, name: 'action', value: 'save', onClick: () => clicks++ }, '保存'));
  let button = await render(form(undefined));
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.type, 'button');
  assert.equal(button.name, 'action');
  assert.equal(button.value, 'save');
  assert.equal(ref.current, button);
  await act(() => button.click());
  assert.equal(clicks, 1);
  assert.equal(submits, 0);
  button = await render(form('submit'));
  await act(() => button.click());
  assert.equal(submits, 1);
});

test('loading 用 Loading 替换前置图标，保留文案、后置图标和焦点，并阻止重复点击', async () => {
  let clicks = 0, parentClicks = 0;
  const content = loading => h('div', { onClick: () => parentClicks++ }, h(Button, {
    loading, onClick: () => clicks++, prefixIcon: h('svg', { 'data-testid': 'prefix' }), suffixIcon: h('svg', { 'data-testid': 'suffix' }),
  }, '提交'));
  let button = await render(content(false));
  assert(button.querySelector('[data-testid="prefix"]'));
  button.focus();
  button = await render(content(true));
  assert.equal(document.activeElement, button);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert(button.hasAttribute('data-disabled'));
  assert.equal(button.getAttribute('data-loading'), '');
  assert.equal(button.getAttribute('data-disabled'), '');
  assert.equal(button.textContent, '提交');
  assert.equal(button.querySelector('[data-testid="prefix"]'), null);
  assert(button.querySelector('[data-testid="suffix"]'));
  assert.equal(button.querySelectorAll('.bkreact-button__icon').length, 1);
  assert.equal(button.querySelector('.bkreact-loading').getAttribute('aria-hidden'), 'true');
  assert.equal(button.querySelector('.bkreact-loading').dataset.type, 'normal');
  assert(button.querySelector('.bkreact-loading svg path'));
  assert.equal(button.querySelector('.bkreact-loading').style.getPropertyValue('--loading-size'), 'var(--button-icon-size)');
  await act(() => button.click());
  assert.equal(clicks, 0);
  assert.equal(parentClicks, 0);
  button = await render(content(false));
  assert(button.querySelector('[data-testid="prefix"]'));
  assert.equal(button.querySelector('.bkreact-loading'), null);
  await act(() => button.click());
  assert.equal(clicks, 1);
  assert.equal(parentClicks, 1);
});

test('disabled 为真正的原生 disabled，不能提交表单或触发 onClick', async () => {
  let count = 0;
  const button = await render(h(Button, { disabled: true, loading: true, onClick: () => count++ }, '保存'));
  assert.equal(button.disabled, true);
  await act(() => button.click());
  assert.equal(count, 0);
});

test('无前置图标的按钮和链接在加载切换时保留槽位与文案，支持展开和收起', async () => {
  for (const extra of [{}, { link: '#loading' }]) {
    const view = loading => h(Button, { ...extra, loading }, '提交订单');
    let button = await render(view(false));
    const leading = button.querySelector('.bkreact-button__leading');
    const label = button.querySelector('.bkreact-button__label');
    assert.equal(leading.hasAttribute('data-visible'), false);
    assert.equal(leading.getAttribute('aria-hidden'), 'true');
    button = await render(view(true));
    assert.equal(button.querySelector('.bkreact-button__leading'), leading);
    assert.equal(button.querySelector('.bkreact-button__label'), label);
    assert.equal(leading.hasAttribute('data-visible'), true);
    assert.equal(button.textContent, '提交订单');
    button = await render(view(false));
    assert.equal(button.querySelector('.bkreact-button__leading'), leading);
    assert.equal(leading.hasAttribute('data-visible'), false);
    assert.equal(button.querySelector('.bkreact-button__label'), label);
  }
  const iconOnly = await render(h(Button, { prefixIcon: h('svg'), 'aria-label': '继续' }));
  assert.equal(iconOnly.querySelector('.bkreact-button__leading').hasAttribute('data-spacing'), false);
});

test('纯图标 loading 提供隐藏名称，保留显式名称和可见文案', async () => {
  const { expect } = await import('storybook/test');
  for (const link of [undefined, '/account']) {
    const view = props => h(Button, { link, loading: true, prefixIcon: h('svg'), ...props });
    let button = await render(view({}));
    await expect(button).toHaveAccessibleName('加载中');
    assert.equal(button.querySelector('.bkreact-button__sr-only').hasAttribute('aria-hidden'), false);
    button = await render(view({ 'aria-label': '保存' }));
    await expect(button).toHaveAccessibleName('保存');
    assert.equal(button.querySelector('.bkreact-button__sr-only'), null);
    await render(h('div', null, h('span', { id: 'button-name' }, '上传'), view({ 'aria-labelledby': 'button-name' })));
    button = container.querySelector('.bkreact-button');
    await expect(button).toHaveAccessibleName('上传');
    assert.equal(button.querySelector('.bkreact-button__sr-only'), null);
    button = await render(view({ children: '提交' }));
    await expect(button).toHaveAccessibleName('提交');
    assert.equal(button.querySelector('.bkreact-button__sr-only'), null);
    button = await render(view({ loading: false }));
    assert.equal(button.querySelector('.bkreact-button__sr-only'), null);
  }
});

test('link 保留原生 anchor 语义、target、rel、事件和 anchor ref', async () => {
  const ref = createRef();
  let clickedElement;
  const button = await render(h(Button, {
    link: '/account', target: '_blank', rel: 'noreferrer', ref,
    onClick: event => { event.preventDefault(); clickedElement = event.currentTarget; },
  }, '账户'));
  assert.equal(button.tagName, 'A');
  assert.equal(button.getAttribute('href'), '/account');
  assert.equal(button.getAttribute('target'), '_blank');
  assert.equal(button.getAttribute('rel'), 'noreferrer');
  assert.equal(button.getAttribute('role'), null);
  assert.equal(ref.current, button);
  await act(() => button.click());
  assert.equal(clickedElement, button);
});

test('禁用或加载的链接移除 href，拦截普通点击与中键点击', async () => {
  let clicks = 0, parentClicks = 0;
  for (const state of [{ disabled: true }, { loading: true }]) {
    const button = await render(h('div', { onClick: () => parentClicks++, onAuxClick: () => parentClicks++ },
      h(Button, { ...state, link: '/account', onClick: () => clicks++, onAuxClick: () => clicks++ }, '账户')));
    assert.equal(button.hasAttribute('href'), false);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    for (const type of ['click', 'auxclick']) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'auxclick' ? 1 : 0 });
      await act(() => button.dispatchEvent(event));
      assert.equal(event.defaultPrevented, true);
    }
  }
  assert.equal(clicks, 0);
  assert.equal(parentClicks, 0);
});

test('全部尺寸与稀疏响应式尺寸都只写入 button tokens', async () => {
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    const button = await render(h(Button, { size, block: true, round: true, className: 'custom' }, '尺寸'));
    assert.equal(button.style.getPropertyValue('--button-base-height'), `var(--button-size-${size}-height)`);
    assert(button.hasAttribute('data-block'));
    assert(button.hasAttribute('data-round'));
    assert(button.classList.contains('custom'));
  }
  const button = await render(h(Button, { size: { sm: 'xs', xl: '2xl' } }, '响应式'));
  assert.equal(button.style.getPropertyValue('--button-base-height'), 'var(--button-size-base-height)');
  assert.equal(button.style.getPropertyValue('--button-sm-height'), 'var(--button-size-xs-height)');
  assert.equal(button.style.getPropertyValue('--button-xl-height'), 'var(--button-size-2xl-height)');
  assert.equal(button.style.getPropertyValue('--button-md-height'), '');
  assert.equal(button.getAttribute('data-size'), 'responsive');
});

test('响应式高度在断点边界切换，缺失断点逐级回退', async () => {
  const tokens = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/tokens.css'), 'utf8'));
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  const button = await render(h(Button, { size: { sm: 'xs', lg: 'lg', '2xl': '2xl' } }, '响应式'));
  for (const [width, expected] of [[0, '40px'], [639, '40px'], [640, '28px'], [767, '28px'], [768, '28px'], [1023, '28px'], [1024, '44px'], [1280, '44px'], [1535, '44px'], [1536, '56px']]) {
    const values = new Map();
    tokens.walkRules('.bkreact-button', rule => rule.walkDecls(decl => values.set(decl.prop, decl.value)));
    styles.walkAtRules('media', media => {
      const minWidth = media.params.match(/^\(min-width: (\d+)rem\)$/);
      if (minWidth && width >= Number(minWidth[1]) * 16) {
        media.walkDecls(decl => values.set(decl.prop, decl.value));
      }
    });
    for (let index = 0; index < button.style.length; index++) {
      const name = button.style.item(index);
      values.set(name, button.style.getPropertyValue(name));
    }
    const resolve = value => {
      while (value.includes('var(')) {
        value = value.replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g, (_, name, fallback) => values.get(name) ?? fallback ?? '');
      }
      return value;
    };
    assert.equal(resolve(values.get('--button-height')), expected, `viewport ${width}px`);
  }
});

test('组件消费样式仅依赖 button tokens，所有 semantic 引用存在，支持两套主题', async () => {
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  styles.walkDecls(declaration => {
    assert.match(declaration.value, /var\(--button-/);
    for (const match of declaration.value.matchAll(/var\((--[a-z0-9-]+)/g)) assert(match[1].startsWith('--button-'));
  });
  const tokens = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/tokens.css'), 'utf8'));
  assert.doesNotMatch(tokens.toString(), /\bcolor-mix\s*\(/i, '组件 tokens 不应自行派生语义颜色');
  for (const theme of ['light', 'dark']) {
    const available = new Set();
    const semanticDir = path.join(projectRoot, 'src/components/themes', theme, 'semantic');
    for (const file of await readdir(semanticDir)) {
      if (!file.endsWith('.css')) continue;
      const css = await readFile(path.join(semanticDir, file), 'utf8');
      postcss.parse(css).walkDecls(declaration => available.add(declaration.prop));
    }
    tokens.walkDecls(declaration => {
      assert(declaration.prop.startsWith('--button-'));
      for (const match of declaration.value.matchAll(/var\((--[a-z0-9-]+)/g)) {
        if (!match[1].startsWith('--button-')) assert(available.has(match[1]), `${theme}: ${match[1]}`);
      }
    });
  }
  for (const intent of ['normal', 'info', 'success', 'warning', 'error']) {
    for (const variant of ['fill', 'line', 'ghost']) {
      const button = await render(h(Button, { intent, variant }, '状态'));
      assert.equal(button.dataset.intent, intent);
      assert.equal(button.dataset.variant, variant);
    }
  }
  const widths = [];
  styles.walkAtRules('media', rule => { if (rule.params.includes('min-width')) widths.push(rule.params); });
  assert.deepEqual(widths, [40, 48, 64, 80, 96].map(width => `(min-width: ${width}rem)`));
  assert(styles.toString().includes('prefers-reduced-motion: reduce'));
});

for (const name of ['ClickInteraction', 'Disabled', 'LoadingCycle', 'LoadingAnimation', 'FormSubmission']) {
  test(`Storybook 示例交互：${name}`, async () => {
    const Story = stories[name];
    const { within, userEvent } = await import('storybook/test');
    await render(h(Story));
    await Story.play({ canvasElement: container, canvas: within(container), userEvent: userEvent.setup() });
  });
}
