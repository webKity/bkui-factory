/**
 * Button 组件单元测试。
 *
 * ⚠️ 本测试基于 JSDOM，以下行为不被验证（需依赖 Playwright / 视觉回归）：
 *   - 媒体查询（@media min-width）的实际生效结果；
 *   - CSS 变量在 getComputedStyle 下的最终解析值（JSDOM 只返回字面量 'var(--x)'）；
 *   - :focus-visible 伪类；
 *   - 布局/尺寸的实际计算结果；
 *   - text-overflow: ellipsis 的真实渲染（仅能验证结构完整性）。
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
  return container.querySelector('.bk-button');
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
  assert.equal(button.hasAttribute('data-disabled'), false, 'loading 不应设置 data-disabled');
  assert.equal(button.hasAttribute('data-loading'), true, 'loading 应设置 data-loading');
  assert.equal(button.textContent, '提交');
  assert.equal(button.querySelector('[data-testid="prefix"]'), null);
  assert.notEqual(button.querySelector('[data-testid="suffix"]'), null);
  assert.equal(button.querySelectorAll('.bk-button__icon').length, 1);
  const spinner = button.querySelector('.bk-button__spinner');
  assert.notEqual(spinner, null, 'loading 时应存在 spinner');
  assert.equal(spinner.getAttribute('aria-hidden'), 'true');
  await act(() => button.click());
  assert.equal(clicks, 0);
  assert.equal(parentClicks, 0);
  button = await render(content(false));
  assert.notEqual(button.querySelector('[data-testid="prefix"]'), null);
  assert.equal(button.querySelector('.bk-button__spinner'), null);
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
  assert.equal(disabledLoading.hasAttribute('data-disabled'), true);
  assert.equal(disabledLoading.hasAttribute('data-loading'), true);
  await act(() => disabledLoading.click());
  assert.equal(count, 0);
});

test('无前置图标的按钮和链接在加载切换时保留槽位与文案，支持展开和收起', async () => {
  for (const extra of [{}, { link: '#loading' }]) {
    const view = loading => h(Button, { ...extra, loading }, '提交订单');
    let button = await render(view(false));
    const leading = button.querySelector('.bk-button__leading');
    const label = button.querySelector('.bk-button__label');
    assert.equal(leading.hasAttribute('data-visible'), false);
    assert.equal(leading.getAttribute('aria-hidden'), 'true');
    button = await render(view(true));
    assert.equal(button.querySelector('.bk-button__leading'), leading, 'loading 前后应复用同一 DOM 节点（避免闪烁）');
    assert.equal(button.querySelector('.bk-button__label'), label);
    assert.equal(leading.hasAttribute('data-visible'), true);
    assert.equal(button.textContent, '提交订单');
    button = await render(view(false));
    assert.equal(button.querySelector('.bk-button__leading'), leading);
    assert.equal(leading.hasAttribute('data-visible'), false);
    assert.equal(button.querySelector('.bk-button__label'), label);
  }
});

test('icon-only 按钮依赖 aria-label 提供可访问名称', async () => {
  const iconOnly = await render(h(Button, { prefixIcon: h('svg'), 'aria-label': '继续' }));
  assert.equal(iconOnly.getAttribute('aria-label'), '继续');
  assert.equal(iconOnly.querySelector('.bk-button__label'), null);
  assert.equal(iconOnly.querySelector('.bk-button__leading').hasAttribute('data-spacing'), false);
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
  assert.equal(button.getAttribute('role'), null);
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
    assert.equal(button.getAttribute('role'), 'link', '移除 href 后仍保留链接语义');
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

test('loading 按钮保留焦点入口，disabled 使用原生禁用语义', async () => {
  const loadingButton = await render(h(Button, { loading: true }, '提交'));
  loadingButton.focus();
  assert.equal(document.activeElement, loadingButton, 'loading 时仍应可聚焦，方便屏幕阅读器感知 spinner');

  loadingButton.blur();
  const disabledButton = await render(h(Button, { disabled: true }, '提交'));
  assert.equal(disabledButton.disabled, true);
  // JSDOM 会将带 tabindex 的 disabled 元素视为可聚焦，故验证原生禁用契约。
  assert(disabledButton.matches(':disabled'));
  assert.equal(loadingButton.getAttribute('aria-busy'), null);
});

test('loading 链接 tabIndex=0 可聚焦，disabled 链接 tabIndex=-1 不可聚焦', async () => {
  const loadingLink = await render(h(Button, { link: '#x', loading: true }, '跳转'));
  assert.equal(loadingLink.getAttribute('tabindex'), '0');
  assert.equal(loadingLink.getAttribute('aria-disabled'), 'true');

  const disabledLink = await render(h(Button, { link: '#x', disabled: true }, '跳转'));
  assert.equal(disabledLink.getAttribute('tabindex'), '-1');
  assert.equal(disabledLink.getAttribute('aria-disabled'), 'true');
});

// ---------- 形状 ----------

test('shape 默认 rect 时不输出 data-shape', async () => {
  const normal = await render(h(Button, {}, '按钮'));
  assert.equal(normal.hasAttribute('data-shape'), false);
});

test('square 输出形状，square + round 组合为圆形', async () => {
  const square = await render(h(Button, { shape: 'square', prefixIcon: h('svg'), 'aria-label': 'square' }));
  assert.equal(square.getAttribute('data-shape'), 'square');

  const circle = await render(h(Button, { shape: 'square', round: true, prefixIcon: h('svg'), 'aria-label': 'circle' }));
  assert.equal(circle.getAttribute('data-shape'), 'square');
  assert(circle.hasAttribute('data-round'));
});

test('block 优先于 shape：不输出 data-shape', async () => {
  const blocked = await render(h(Button, { block: true, shape: 'square' }, '整行'));
  assert.equal(blocked.hasAttribute('data-block'), true);
  assert.equal(blocked.hasAttribute('data-shape'), false);
});

// ---------- 宽度模式 ----------

test('widthMode 默认 auto，不输出 data-width-mode', async () => {
  const button = await render(h(Button, {}, '按钮'));
  assert.equal(button.hasAttribute('data-width-mode'), false);
});

test('widthMode=fixed 输出 data-width-mode 并注入 --button-base-fixed-width token', async () => {
  const button = await render(h(Button, { widthMode: 'fixed' }, '按钮'));
  assert.equal(button.getAttribute('data-width-mode'), 'fixed');
  assert.equal(
    button.style.getPropertyValue('--button-base-fixed-width'),
    'var(--button-size-base-fixed-width)',
  );
});

test('优先级：block > shape > widthMode（逐层降级）', async () => {
  // block + fixed → fixed 降级
  const blocked = await render(h(Button, { block: true, widthMode: 'fixed' }, '按钮'));
  assert.equal(blocked.hasAttribute('data-block'), true);
  assert.equal(blocked.hasAttribute('data-width-mode'), false);

  // shape + fixed → fixed 降级
  const shaped = await render(h(Button, { shape: 'square', widthMode: 'fixed', prefixIcon: h('svg'), 'aria-label': 'x' }));
  assert.equal(shaped.getAttribute('data-shape'), 'square');
  assert.equal(shaped.hasAttribute('data-width-mode'), false);

  // block + shape + fixed → shape 和 widthMode 都降级
  const all = await render(h(Button, { block: true, shape: 'square', widthMode: 'fixed', prefixIcon: h('svg'), 'aria-label': 'x' }));
  assert.equal(all.hasAttribute('data-block'), true);
  assert.equal(all.hasAttribute('data-shape'), false);
  assert.equal(all.hasAttribute('data-width-mode'), false);
});

test('widthMode=fixed 保留图标与文案结构，供 text-overflow: ellipsis 生效', async () => {
  const button = await render(h(Button, {
    widthMode: 'fixed',
    prefixIcon: h('svg', { 'data-testid': 'icon' }),
    suffixIcon: h('svg', { 'data-testid': 'suffix' }),
  }, '非常非常非常非常长的文案内容'));
  assert.equal(button.getAttribute('data-width-mode'), 'fixed');
  assert.notEqual(button.querySelector('[data-testid="icon"]'), null, '前置图标应保留');
  assert.notEqual(button.querySelector('[data-testid="suffix"]'), null, '后置图标应保留');
  assert.notEqual(button.querySelector('.bk-button__label'), null, '文案容器应保留');
});

test('响应式 size 时 fixed-width token 随断点变化', async () => {
  const button = await render(h(Button, {
    widthMode: 'fixed',
    size: { base: 'sm', sm: 'xs', lg: 'lg' },
  }, '按钮'));
  assert.equal(
    button.style.getPropertyValue('--button-base-fixed-width'),
    'var(--button-size-sm-fixed-width)',
  );
  assert.equal(
    button.style.getPropertyValue('--button-sm-fixed-width'),
    'var(--button-size-xs-fixed-width)',
  );
  assert.equal(
    button.style.getPropertyValue('--button-lg-fixed-width'),
    'var(--button-size-lg-fixed-width)',
  );
  assert.equal(button.style.getPropertyValue('--button-md-fixed-width'), '');
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
  const button = await render(h(Button, { size: { base: 'sm', sm: 'xs', xl: '2xl' } }, '响应式'));
  assert.equal(button.style.getPropertyValue('--button-base-height'), 'var(--button-size-sm-height)');
  assert(button.hasAttribute('data-size-sm'));
  assert(button.hasAttribute('data-size-xl'));
  assert(!button.hasAttribute('data-size-md'));
  assert.equal(button.style.getPropertyValue('--button-sm-height'), 'var(--button-size-xs-height)');
  assert.equal(button.style.getPropertyValue('--button-xl-height'), 'var(--button-size-2xl-height)');
  assert.equal(button.style.getPropertyValue('--button-md-height'), '');
  assert.equal(button.getAttribute('data-size'), 'responsive');
});

// ---------- 运行时边界 ----------

test('运行时忽略 link 的表单 type，保留按钮原生属性', async () => {

  const linkWithType = await render(h(Button, { link: '#x', type: 'submit' }, '跳转'));
  assert.equal(linkWithType.tagName, 'A');
  assert.equal(linkWithType.hasAttribute('type'), false);

  const withTarget = await render(h(Button, { target: '_blank' }, '按钮'));
  assert.equal(withTarget.tagName, 'BUTTON');
});

// ---------- 静态 CSS 契约 ----------

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
  assert.doesNotMatch(tokens.toString(), /\bcolor-mix\s*\(/i);
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
  for (const intent of ['brand', 'success', 'danger', 'warning', 'normal']) {
    for (const variant of ['outline', 'fill', 'ghost']) {
      const button = await render(h(Button, { intent, variant }, '状态'));
      assert.equal(button.dataset.intent, intent);
      assert.equal(button.dataset.variant, variant);
    }
  }
});

test('styles.css 定义 shape / fixed 规则并消费对应 tokens', async () => {
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  const source = styles.toString();
  assert.match(source, /\[data-shape='square'\]/);
  assert.doesNotMatch(source, /\[data-shape='circle'\]/);
  assert.match(source, /var\(--button-shape-square-size\)/);
  assert.match(source, /var\(--button-round-border-radius\)/);

  assert.match(source, /\[data-width-mode='fixed'\]/);
  assert.match(source, /var\(--button-fixed-width\)/);
  assert.match(source, /var\(--button-fixed-text-overflow\)/);
  assert.match(source, /text-overflow:\s*var\(--button-fixed-text-overflow\)/);
  // 用 calc 拼接 content-width + 2 × padding-x + 2 × border-width，保持 border-box 语义
  assert.match(source, /calc\(var\(--button-fixed-width\)\s*\+\s*var\(--button-padding-x\)\s*\*\s*2\s*\+\s*var\(--button-border-width\)\s*\*\s*2\)/);
});

test('响应式断点为 40/48/64/80/96rem，每个断点定义全部尺寸维度且只对显式配置的断点生效', async () => {
  const styles = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  const dimensions = ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size', 'fixed-width'];
  const widths = [];
  styles.walkAtRules('media', rule => {
    if (rule.params.includes('min-width')) widths.push(rule.params);
  });
  assert.deepEqual(widths, [40, 48, 64, 80, 96].map(width => `(min-width: ${width}rem)`));

  for (const [width, breakpoint] of [[40, 'sm'], [48, 'md'], [64, 'lg'], [80, 'xl'], [96, '2xl']]) {
    let mediaNode;
    styles.walkAtRules('media', rule => {
      if (rule.params === `(min-width: ${width}rem)`) mediaNode = rule;
    });
    assert.notEqual(mediaNode, undefined, `缺少 @media (min-width: ${width}rem)`);
    for (const dim of dimensions) {
      const decls = [];
      mediaNode.walkDecls(`--button-${dim}`, d => decls.push(d));
      assert.equal(decls.length, 1, `${width}rem 断点应定义 --button-${dim}`);
      assert.equal(decls[0].value, `var(--button-${breakpoint}-${dim})`);
      assert.equal(decls[0].parent.selector, `.bk-button[data-size-${breakpoint}]`);
    }
  }

  assert(styles.toString().includes('prefers-reduced-motion: reduce'));
});

// ---------- Storybook 交互复用 ----------

for (const name of ['ClickInteraction', 'Disabled', 'LoadingCycle', 'LoadingAnimation', 'FormSubmission']) {
  test(`Storybook 示例交互：${name}`, async () => {
    const Story = stories[name];
    await render(h(Story));
    await Story.play({ canvasElement: container, canvas: within(container), userEvent: userEvent.setup() });
  });
}

test('Button 实际类名覆盖全部设计 tokens，所有局部引用均有定义，动画名称匹配', async () => {
  const css = (await Promise.all(['design.tokens.css', 'tokens.css', 'styles.css'].map(file =>
    readFile(path.join(projectRoot, 'src/components/button', file), 'utf8')))).join('\n');
  const ast = postcss.parse(css);
  const declared = new Set();
  ast.walkDecls(d => { if (d.prop.startsWith('--button-')) declared.add(d.prop); });
  const button = await render(h(Button, { size: { base: 'sm', lg: 'xl' }, widthMode: 'fixed' }, '固定宽度'));
  for (let i = 0; i < button.style.length; i++) declared.add(button.style[i]);
  const design = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/design.tokens.css'), 'utf8'));
  const baseRule = design.nodes.find(node => node.selector === '.bk-button');
  assert(baseRule, '生成器必须使用组件实际的根类名');
  assert(button.matches(baseRule.selector));
  assert.doesNotMatch(css, /bkreact-button/);
  ast.walkDecls(d => {
    for (const [, name] of d.value.matchAll(/var\((--button-[\w-]+)/g)) {
      // 断点引用仅在对应 data-size-* 出现时使用；每个断点的维度结构已由上面的测试验证。
      if (/^--button-(sm|md|lg|xl|2xl)-/.test(name)) continue;
      assert(declared.has(name), `未定义的 Button token：${name}`);
    }
  });
  const animations = new Set();
  ast.walkAtRules('keyframes', rule => animations.add(rule.params));
  ast.walkDecls('--button-spinner-animation', d => assert(animations.has(d.value.split(' ')[0])));
});

test('无前置图标且非 loading 时不渲染 spinner；disabled 优先于 loading 的透明度', async () => {
  const button = await render(h(Button, {}, '按钮'));
  assert.equal(button.querySelector('.bk-button__spinner'), null);
  const ast = postcss.parse(await readFile(path.join(projectRoot, 'src/components/button/styles.css'), 'utf8'));
  for (const state of [{ loading: true }, { disabled: true, loading: true }]) {
    const button = await render(h(Button, state, '按钮'));
    const opacities = [];
    ast.walkRules(rule => {
      if (rule.parent.type === 'root' && button.matches(rule.selector)) {
        rule.walkDecls('opacity', d => opacities.push(d.value));
      }
    });
    assert.equal(opacities.at(-1), state.disabled ? 'var(--button-disabled-opacity)' : 'var(--button-loading-opacity)');
  }
});


test('fixed / square 在按钮与链接模式均保留形状、响应式尺寸和 loading 切换', async () => {
  for (const link of [undefined, '#target']) {
    for (const geometry of [{ widthMode: 'fixed' }, { shape: 'square', round: true }]) {
      const view = loading => h(Button, {
        ...geometry, link, loading, intent: 'brand', variant: 'outline',
        size: { base: 'xs', lg: 'xl' }, prefixIcon: h('svg'), 'aria-label': '继续',
      });
      let button = await render(view(false));
      const expected = geometry.shape ? 'square' : 'fixed';
      const attribute = geometry.shape ? 'data-shape' : 'data-width-mode';
      assert.equal(button.tagName, link ? 'A' : 'BUTTON');
      assert.equal(button.getAttribute(attribute), expected);
      assert(!button.hasAttribute('shape'));
      assert(!button.hasAttribute('widthmode'));
      assert(button.hasAttribute('data-size-lg'));
      assert(!button.hasAttribute('data-size-md'));
      const sizeStyle = button.getAttribute('style');
      button = await render(view(true));
      assert.equal(button.getAttribute(attribute), expected);
      assert.equal(button.getAttribute('style'), sizeStyle);
      assert(button.querySelector('.bk-button__spinner'));
      button = await render(view(false));
      assert.equal(button.querySelector('.bk-button__spinner'), null);
      assert(button.querySelector('.bk-button__icon'));
      if (link) assert.equal(button.getAttribute('href'), link);
    }
  }
});
