/**
 * Button 组件单元测试。
 *
 * ⚠️ 本测试基于 JSDOM，以下行为不被验证（需依赖 Playwright / 视觉回归）：
 *   - 媒体查询（@media min-width）的实际生效结果；
 *   - CSS 变量在 getComputedStyle 下的最终解析值（JSDOM 只返回字面量 'var(--x)'）；
 *   - :focus-visible 伪类；
 *   - 布局/尺寸的实际计算结果。
 */
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

const DOM_GLOBALS = [
  'window', 'document', 'navigator',
  'HTMLElement', 'HTMLButtonElement', 'HTMLAnchorElement',
  'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent',
];

let Button, createRoot, dom, temporary, stories;
let configure, within, userEvent;
let root, container;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test', pretendToBeVisual: true });
  for (const name of DOM_GLOBALS) {
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const storybookTest = await import('storybook/test');
  ({ configure, within, userEvent } = storybookTest);
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
  // 显式清理 DOM 全局变量，避免泄漏到同进程内的其他测试文件（node:test 默认并行）。
  for (const name of DOM_GLOBALS) delete globalThis[name];
  delete globalThis.getComputedStyle;
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

// ---------- 基础行为 ----------

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

test('loading 用 spinner 替换前置图标，保留文案、后置图标和焦点，并阻止重复点击', async () => {
  let clicks = 0, parentClicks = 0;
  const content = loading => h('div', { onClick: () => parentClicks++ }, h(Button, {
    loading, onClick: () => clicks++, prefixIcon: h('svg', { 'data-testid': 'prefix' }), suffixIcon: h('svg', { 'data-testid': 'suffix' }),
  }, '提交'));
  let button = await render(content(false));
  assert.notEqual(button.querySelector('[data-testid="prefix"]'), null);
  button.focus();
  button = await render(content(true));
  assert.equal(document.activeElement, button);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  // 关键：loading 不应触发 data-disabled（那是视觉禁用专用属性），只应触发 data-loading
  assert.equal(button.hasAttribute('data-disabled'), false, 'loading 不应设置 data-disabled');
  assert.equal(button.hasAttribute('data-loading'), true, 'loading 应设置 data-loading');
  assert.equal(button.textContent, '提交');
  assert.equal(button.querySelector('[data-testid="prefix"]'), null);
  assert.notEqual(button.querySelector('[data-testid="suffix"]'), null);
  assert.equal(button.querySelectorAll('.bkreact-button__icon').length, 1);
  const spinner = button.querySelector('.bkreact-button__spinner');
  assert.notEqual(spinner, null, 'loading 时应存在 spinner');
  assert.equal(spinner.getAttribute('aria-hidden'), 'true');
  await act(() => button.click());
  assert.equal(clicks, 0);
  assert.equal(parentClicks, 0);
  button = await render(content(false));
  assert.notEqual(button.querySelector('[data-testid="prefix"]'), null);
  assert.equal(button.querySelector('.bkreact-button__spinner'), null);
  // loading 结束后瞬时状态需被清除
  assert.equal(button.getAttribute('aria-busy'), null);
  assert.equal(button.hasAttribute('data-loading'), false);
  await act(() => button.click());
  assert.equal(clicks, 1);
  assert.equal(parentClicks, 1);
});

test('disabled 为真正的原生 disabled，不能提交表单或触发 onClick；disabled + loading 两者属性共存', async () => {
  let count = 0;

  const disabledOnly = await render(h(Button, { disabled: true, onClick: () => count++ }, '保存'));
  assert.equal(disabledOnly.disabled, true);
  assert.equal(disabledOnly.hasAttribute('data-disabled'), true);
  assert.equal(disabledOnly.hasAttribute('data-loading'), false);
  await act(() => disabledOnly.click());
  assert.equal(count, 0);

  const disabledLoading = await render(h(Button, { disabled: true, loading: true, onClick: () => count++ }, '保存'));
  assert.equal(disabledLoading.disabled, true);
  assert.equal(disabledLoading.hasAttribute('data-disabled'), true, 'disabled 优先设置 data-disabled');
  assert.equal(disabledLoading.hasAttribute('data-loading'), true, 'loading 同时设置 data-loading');
  await act(() => disabledLoading.click());
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
    assert.equal(button.querySelector('.bkreact-button__leading'), leading, 'loading 前后应复用同一 DOM 节点（避免闪烁）');
    assert.equal(button.querySelector('.bkreact-button__label'), label);
    assert.equal(leading.hasAttribute('data-visible'), true);
    assert.equal(button.textContent, '提交订单');
    button = await render(view(false));
    assert.equal(button.querySelector('.bkreact-button__leading'), leading);
    assert.equal(leading.hasAttribute('data-visible'), false);
    assert.equal(button.querySelector('.bkreact-button__label'), label);
  }
});

test('icon-only 按钮依赖 aria-label 提供可访问名称', async () => {
  const iconOnly = await render(h(Button, { prefixIcon: h('svg'), 'aria-label': '继续' }));
  assert.equal(iconOnly.getAttribute('aria-label'), '继续');
  assert.equal(iconOnly.querySelector('.bkreact-button__label'), null, 'icon-only 时不应有可见文案');
  assert.equal(iconOnly.querySelector('.bkreact-button__leading').hasAttribute('data-spacing'), false);
});

// ---------- 链接语义 ----------

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
  assert.equal(button.getAttribute('role'), null, '不应显式设置 role，让浏览器按 <a href> 推导 link 角色');
  assert.equal(ref.current, button);
  await act(() => button.click());
  assert.equal(clickedElement, button);
});

test('禁用或加载的链接移除 href，拦截普通点击与中键点击，data-* 属性分离', async () => {
  let clicks = 0, parentClicks = 0;
  for (const state of [{ disabled: true }, { loading: true }]) {
    const button = await render(h('div', { onClick: () => parentClicks++, onAuxClick: () => parentClicks++ },
      h(Button, { ...state, link: '/account', onClick: () => clicks++, onAuxClick: () => clicks++ }, '账户')));
    assert.equal(button.hasAttribute('href'), false);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    assert.equal(within(container).getByRole('link', { name: '账户' }), button);
    // disabled / loading 各自触发对应的 data 属性，互不叠加
    assert.equal(button.hasAttribute('data-disabled'), 'disabled' in state, `disabled=${'disabled' in state}`);
    assert.equal(button.hasAttribute('data-loading'), 'loading' in state, `loading=${'loading' in state}`);
    for (const type of ['click', 'auxclick']) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'auxclick' ? 1 : 0 });
      await act(() => button.dispatchEvent(event));
      assert.equal(event.defaultPrevented, true, `${type} 应被 preventDefault`);
    }
  }
  assert.equal(clicks, 0);
  assert.equal(parentClicks, 0);
});

// ---------- 焦点与键盘可访问性 ----------

test('loading 按钮仍可聚焦，原生 disabled 按钮退出 Tab 顺序', async () => {
  const loadingButton = await render(h(Button, { loading: true }, '提交'));
  loadingButton.focus();
  assert.equal(document.activeElement, loadingButton, 'loading 时仍应可聚焦，方便屏幕阅读器感知 spinner');
  // 先移开已有焦点，再验证键盘导航会跳过 disabled 按钮。
  loadingButton.blur();
  assert.notEqual(document.activeElement, loadingButton);

  const disabledButton = await render(h(Button, { disabled: true }, '提交'));
  assert.equal(disabledButton.disabled, true);
  // JSDOM 会允许带 tabindex 的 disabled 按钮调用 focus()；这里验证用户 Tab 行为。
  await userEvent.setup().tab();
  assert.notEqual(document.activeElement, disabledButton, 'Tab 应跳过原生 disabled 按钮');
});

test('loading 链接保留 Tab 入口，disabled 链接退出 Tab 顺序但允许程序聚焦', async () => {
  const loadingLink = await render(h(Button, { link: '#x', loading: true }, '跳转'));
  assert.equal(loadingLink.getAttribute('tabindex'), '0');
  assert.equal(loadingLink.getAttribute('aria-disabled'), 'true');
  loadingLink.focus();
  assert.equal(document.activeElement, loadingLink);
  loadingLink.blur();

  const disabledLink = await render(h(Button, { link: '#x', disabled: true }, '跳转'));
  assert.equal(disabledLink.getAttribute('tabindex'), '-1');
  assert.equal(disabledLink.getAttribute('aria-disabled'), 'true');
  disabledLink.focus();
  assert.equal(document.activeElement, disabledLink);
});

test('链接各状态保留调用方指定的 role', async () => {
  for (const state of [{}, { disabled: true }, { loading: true }]) {
    const button = await render(h(Button, { link: '#x', role: 'button', ...state }, '操作'));
    assert.equal(within(container).getByRole('button', { name: '操作' }), button);
  }
});

// ---------- 尺寸 ----------

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

// ---------- 运行时边界 ----------

test('运行时边界 props 不崩溃：未知 size、link 传 type、button 传 target', async () => {
  // 未知 size key：退化为响应式标记，不应崩溃
  const unknownSize = await render(h(Button, { size: { '3xl': 'lg' } }, '尺寸'));
  assert.equal(unknownSize.getAttribute('data-size'), 'responsive');

  // link 模式下 type 被解构，不应传到 <a>
  const linkWithType = await render(h(Button, { link: '#x', type: 'submit' }, '跳转'));
  assert.equal(linkWithType.tagName, 'A');
  assert.equal(linkWithType.hasAttribute('type'), false, 'link 模式下 type 不应出现在 <a> 上');

  // 非 link 传 target：允许 React 透传，元素仍是 <button>
  const withTarget = await render(h(Button, { target: '_blank' }, '按钮'));
  assert.equal(withTarget.tagName, 'BUTTON');
});

// ---------- 静态 CSS 契约 ----------

test('spinner 引用的 tokens 均有定义，动画名称对应实际 keyframes', async () => {
  const tokens = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/tokens.css'), 'utf8'));
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  const definitions = new Map();
  tokens.walkDecls(declaration => definitions.set(declaration.prop, declaration.value));
  const references = new Set();
  styles.walkDecls(declaration => {
    for (const match of declaration.value.matchAll(/var\((--button-spinner-[a-z0-9-]+)/g)) {
      references.add(match[1]);
    }
  });
  assert(references.size > 0, '应存在 spinner token 引用');
  for (const name of references) assert(definitions.has(name), `缺少 spinner token：${name}`);
  const animationName = definitions.get('--button-spinner-animation').split(/\s+/)[0];
  const keyframes = [];
  styles.walkAtRules('keyframes', rule => keyframes.push(rule.params));
  assert(keyframes.includes(animationName), `缺少动画定义：${animationName}`);
  assert.equal(definitions.get('--button-spinner-reduced-motion-animation'), 'none');
});

test('styles.css 只引用 --button-* tokens', async () => {
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  styles.walkDecls(declaration => {
    for (const match of declaration.value.matchAll(/var\((--[a-z0-9-]+)/g)) {
      assert(match[1].startsWith('--button-'), `styles.css 不得引用非 button token：${match[1]}`);
    }
  });
});

test('tokens.css 不自行派生颜色（禁用 color-mix 等）', async () => {
  const tokens = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/tokens.css'), 'utf8'));
  assert.doesNotMatch(tokens.toString(), /\bcolor-mix\s*\(/i, '组件 tokens 不应自行派生语义颜色');
});

test('light 和 dark 主题下的所有 semantic token 引用都存在', async () => {
  const tokens = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/tokens.css'), 'utf8'));
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
        if (!match[1].startsWith('--button-')) {
          assert(available.has(match[1]), `${theme}: 缺少 semantic token ${match[1]}`);
        }
      }
    });
  }
});

test('15 个 intent × variant 组合正确映射到 data-* 属性', async () => {
  for (const intent of ['normal', 'info', 'success', 'warning', 'error']) {
    for (const variant of ['fill', 'line', 'ghost']) {
      const button = await render(h(Button, { intent, variant }, '状态'));
      assert.equal(button.dataset.intent, intent);
      assert.equal(button.dataset.variant, variant);
    }
  }
});

test('响应式断点为 40/48/64/80/96rem，每个断点定义全部尺寸维度且 fallback 到 size-base', async () => {
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  const dimensions = ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size'];
  const widths = [];
  styles.walkAtRules('media', rule => {
    if (rule.params.includes('min-width')) widths.push(rule.params);
  });
  assert.deepEqual(widths, [40, 48, 64, 80, 96].map(width => `(min-width: ${width}rem)`));

  for (const width of [40, 48, 64, 80, 96]) {
    let mediaNode;
    styles.walkAtRules('media', rule => {
      if (rule.params === `(min-width: ${width}rem)`) mediaNode = rule;
    });
    assert.notEqual(mediaNode, undefined, `缺少 @media (min-width: ${width}rem)`);
    for (const dim of dimensions) {
      const decls = [];
      mediaNode.walkDecls(`--button-${dim}`, d => decls.push(d));
      assert.equal(decls.length, 1, `${width}rem 断点应定义 --button-${dim}`);
      assert.match(
        decls[0].value,
        new RegExp(`var\\(--button-size-base-${dim}`),
        `${width}rem 的 --button-${dim} 应 fallback 到 --button-size-base-${dim}`,
      );
    }
  }

  assert(styles.toString().includes('prefers-reduced-motion: reduce'), '应包含 prefers-reduced-motion 分支');
});

// ---------- Storybook 交互复用 ----------

for (const name of ['ClickInteraction', 'Disabled', 'LoadingCycle', 'LoadingAnimation', 'FormSubmission']) {
  test(`Storybook 示例交互：${name}`, async () => {
    const Story = stories[name];
    await render(h(Story));
    await Story.play({ canvasElement: container, canvas: within(container), userEvent: userEvent.setup() });
  });
}
