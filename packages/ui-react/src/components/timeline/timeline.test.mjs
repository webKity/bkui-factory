import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, afterEach, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import postcss from 'postcss';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildTokenModel } from '../../../../../scripts/tokens/source.mjs';
import { buildTokenFiles } from '../../../../../scripts/tokens/build.mjs';

let api, createRoot, dom, temporary, root, container;
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node'];
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const output = fileURLToPath(new URL('../../../../../.test-output/', import.meta.url));
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(`${output}timeline-`);
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./index.tsx', import.meta.url))], bundle: true,
    packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  await writeFile(`${temporary}/timeline.mjs`, result.outputFiles[0].contents);
  api = await import(`${temporary}/timeline.mjs`);
  ({ createRoot } = await import('react-dom/client'));
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = container = undefined;
});
after(async () => {
  dom?.window.close();
  for (const name of globals) delete globalThis[name];
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  if (temporary) await rm(temporary, { recursive: true, force: true });
});
async function render(element) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() => root.render(element));
  return container.firstElementChild;
}
function event(title, props = {}) {
  return h(api.TimelineItem, props, h(api.TimelineMarker), h(api.TimelineContent, null, h(api.TimelineTitle, null, title)));
}

test('原生列表、时间和标题语义，所有子组件透传属性与 ref', async () => {
  const names = ['TimelineRoot', 'TimelineItem', 'TimelineMarker', 'TimelineContent', 'TimelineTime', 'TimelineTitle', 'TimelineDescription', 'TimelineAction'];
  const refs = Object.fromEntries(names.map(name => [name, createRef()]));
  let clicks = 0;
  const list = await render(h(api.TimelineRoot, { ref: refs.TimelineRoot, 'aria-label': '进展', className: 'custom', reversed: true },
    h(api.TimelineItem, { ref: refs.TimelineItem, value: 3 },
      h(api.TimelineMarker, { ref: refs.TimelineMarker }),
      h(api.TimelineContent, { ref: refs.TimelineContent },
        h(api.TimelineTime, { ref: refs.TimelineTime, dateTime: '2026-10-29' }, '10 月 29 日'),
        h(api.TimelineTitle, { ref: refs.TimelineTitle }, '完成'),
        h(api.TimelineDescription, { ref: refs.TimelineDescription }, '处理成功'),
        h(api.TimelineAction, { ref: refs.TimelineAction }, h('button', { onClick: () => clicks++ }, '查看'))))));
  assert.equal(api.Timeline, api.TimelineRoot);
  assert.equal(list.tagName, 'OL');
  assert.equal(list.getAttribute('aria-label'), '进展');
  assert(list.reversed);
  assert(list.classList.contains('custom'));
  assert.equal(list.firstElementChild.tagName, 'LI');
  assert.equal(list.firstElementChild.value, 3);
  assert.equal(list.dataset.layout, 'vertical');
  assert.equal(list.dataset.size, 'base');
  assert.equal(list.querySelector('time').dateTime, '2026-10-29');
  assert.equal(list.querySelector('h3').textContent, '完成');
  for (const [name, tag] of names.map((name, i) => [name, ['OL', 'LI', 'SPAN', 'DIV', 'TIME', 'H3', 'P', 'DIV'][i]])) {
    assert.equal(refs[name].current.tagName, tag);
  }
  await act(() => list.querySelector('button').click());
  assert.equal(clicks, 1);
});

test('布局由 Root 统一管理，冲突覆盖被忽略且嵌套 Root 隔离', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', message => warnings.push(message));
  const children = () => [event('继承', { key: 'a' }), event('覆盖', { key: 'b', layout: 'vertical' }),
    h(api.TimelineItem, { key: 'c' }, h(api.TimelineMarker), h(api.TimelineContent, null, h(api.Timeline, null, event('嵌套'))))];
  let list = await render(h(api.Timeline, { layout: 'horizontal' }, children()));
  assert.deepEqual([...list.children].map(item => item.dataset.layout), ['horizontal', 'horizontal', 'horizontal']);
  assert(warnings.some(message => message.includes('不支持混合布局')));
  const nested = list.querySelector('ol');
  assert.equal(nested.dataset.layout, 'vertical');
  assert.equal(nested.firstElementChild.dataset.layout, 'vertical');
  list = await render(h(api.Timeline, { layout: 'vertical' }, children()));
  assert([...list.children].every(item => item.dataset.layout === 'vertical'));
  list = await render(h(api.Timeline, { layout: 'vertical' }, event('反向冲突', { layout: 'horizontal' })));
  assert.equal(list.firstElementChild.dataset.layout, 'vertical');
});

test('响应式尺寸只生成显式断点引用，更新时清除旧断点', async () => {
  let list = await render(h(api.Timeline, { size: { base: 'xs', md: 'lg', xl: '2xl' } }, event('进展')));
  assert.equal(list.dataset.size, 'responsive');
  assert(list.hasAttribute('data-size-md'));
  assert(!list.hasAttribute('data-size-sm'));
  assert.equal(list.style.getPropertyValue('--timeline-base-marker-size'), 'var(--timeline-size-xs-marker-size)');
  assert.equal(list.style.getPropertyValue('--timeline-md-font-size'), 'var(--timeline-size-lg-font-size)');
  assert.equal(list.style.getPropertyValue('--timeline-sm-gap'), '');
  list = await render(h(api.Timeline, { size: 'sm' }));
  assert.equal(list.children.length, 0);
  assert.equal(list.dataset.size, 'sm');
  assert(!list.hasAttribute('data-size-md'));
  assert.equal(list.style.getPropertyValue('--timeline-md-font-size'), '');
});

test('装饰标记隐藏于辅助技术，icon 优先并保留自定义内容', async () => {
  const list = await render(h(api.Timeline, null,
    h(api.TimelineItem, null,
      h(api.TimelineMarker, { icon: h('svg', { 'data-icon': true }), 'aria-hidden': false }, 'fallback'),
      h(api.TimelineMarker, null, '✓'), h(api.TimelineMarker))));
  const markers = [...list.querySelectorAll('.bkreact-timeline__marker')];
  assert.equal(markers[0].getAttribute('aria-hidden'), 'true');
  assert.equal(markers[1].getAttribute('aria-hidden'), null);
  assert.equal(markers[2].getAttribute('aria-hidden'), 'true');
  assert(markers[0].querySelector('svg'));
  assert.equal(markers[0].textContent, '');
  assert.equal(markers[1].textContent, '✓');
  assert(markers[1].hasAttribute('data-custom'));
  assert(!markers[2].hasAttribute('data-custom'));
});

test('分层 token 无悬空引用，七档尺寸、断点与末项连接线规则完整', async () => {
  const outputs = await buildTokenFiles();
  const design = outputs.get('packages/ui-react/src/components/timeline/design.tokens.css');
  assert.match(design, /\.bkreact-timeline\s*\{/);
  assert.equal(design, await readFile(new URL('./design.tokens.css', import.meta.url), 'utf8'));
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  const variables = new Set();
  for (const css of [design, tokens, styles]) postcss.parse(css).walkDecls(({ prop, value }) => {
    if (prop.startsWith('--')) variables.add(prop);
    assert.doesNotMatch(value, /var\(\s*--[\w-]+\s*,/);
  });
  postcss.parse(styles).walkDecls(({ prop, value }) => {
    if (prop.startsWith('--')) return;
    for (const match of value.matchAll(/var\((--[\w-]+)\)/g)) assert(match[1].startsWith('--timeline-'), match[1]);
  });
  // base / 断点变量由 size.ts 按输入动态生成。
  for (const css of [design, tokens, styles]) for (const [, name] of css.matchAll(/var\((--timeline-[\w-]+)\)/g)) {
    assert(variables.has(name) || /^--timeline-(base|sm|md|lg|xl|2xl)-(font-size|time-font-size|line-height|marker-size|gap|item-gap)$/.test(name), name);
  }
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    for (const dimension of ['font-size', 'time-font-size', 'line-height', 'marker-size', 'gap', 'item-gap']) assert(variables.has(`--timeline-size-${size}-${dimension}`));
  }
  assert.match(styles, /:last-child::before\s*\{\s*display: var\(--timeline-no-display\)/);
  const media = [];
  postcss.parse(styles).walkAtRules('media', rule => media.push(rule.params));
  assert.deepEqual(media, [40, 48, 64, 80, 96].map(width => `(min-width: ${width}rem)`));
});


test('横向居中对齐会继承和更新，圆点右侧文字保持可访问', async () => {
  const entry = () => h(api.TimelineItem, null,
    h(api.TimelineMarker, { label: '审核通过' }),
    h(api.TimelineContent, null, h(api.TimelineTitle, null, '申请进度')));
  let list = await render(h(api.Timeline, { layout: 'horizontal', align: 'center' }, entry()));
  assert.equal(list.dataset.align, 'center');
  assert.equal(list.firstElementChild.dataset.align, 'center');
  const label = list.querySelector('.bkreact-timeline__marker-label');
  assert.equal(label.textContent, '审核通过');
  assert.equal(label.closest('[aria-hidden="true"]'), null);
  assert.equal(list.querySelector('.bkreact-timeline__marker').getAttribute('aria-hidden'), 'true');
  assert.equal(list.querySelector('.bkreact-timeline__marker').getAttribute('label'), null);
  list = await render(h(api.Timeline, { layout: 'horizontal' }, entry()));
  assert.equal(list.firstElementChild.dataset.align, 'start');
});

test('实心圆点、较弱时间层级和横向线段使用独立 tokens', async () => {
  const outputs = await buildTokenFiles();
  const design = outputs.get('packages/ui-react/src/components/timeline/design.tokens.css');
  assert.match(design, /--timeline-marker-bg: var\(--color-text-tertiary\)/);
  assert.match(design, /--timeline-time-color: var\(--color-text-tertiary\)/);
  assert.match(design, /--timeline-size-base-time-font-size: var\(--text-sm-size\)/);
  const styles = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const rules = new Map();
  styles.walkRules(rule => rules.set(rule.selector, Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))));
  assert.equal(rules.get('.bkreact-timeline__time')['font-size'], 'var(--timeline-time-font-size)');
  assert.equal(rules.get('.bkreact-timeline__marker[data-custom]')['background-color'], 'var(--timeline-custom-marker-bg)');
  assert.equal(rules.get(".bkreact-timeline__item[data-layout='horizontal']::before").display, 'var(--timeline-no-display)');
  assert.equal(rules.get(".bkreact-timeline__item[data-layout='horizontal'][data-align='center'] > .bkreact-timeline__content")['text-align'], 'var(--timeline-center)');
});


test('自定义标记支持圆点加文字、样式和尺寸，步进状态随受控渲染更新', async () => {
  function steps(current) {
    return h(api.Timeline, { layout: 'horizontal' }, ...['提交', '审核', '完成'].map((title, index) =>
      h(api.TimelineItem, { key: title, status: index < current ? 'complete' : index === current ? 'current' : 'pending' },
        h(api.TimelineMarker, { className: 'custom-point', style: { gap: 8, borderRadius: 4 } },
          h('span', { style: { width: 8, height: 8, background: 'gray' } }), h('span', null, title)),
        h(api.TimelineContent, null, title))));
  }
  let list = await render(steps(1));
  assert.deepEqual([...list.children].map(item => item.dataset.status), ['complete', 'current', 'pending']);
  assert.equal(list.querySelectorAll('[aria-current="step"]').length, 1);
  const marker = list.querySelector('.custom-point');
  assert(marker.hasAttribute('data-custom-content'));
  assert.equal(marker.style.gap, '8px');
  assert.equal(marker.style.borderRadius, '4px');
  assert.equal(marker.children.length, 2);
  assert.equal(marker.closest('[aria-hidden="true"]'), null);
  list = await render(steps(3));
  assert([...list.children].every(item => item.dataset.status === 'complete'));
  assert.equal(list.querySelector('[aria-current="step"]'), null);
});


test('非法字符串、缺失 base 或非法响应式尺寸在 SSR 时直接拒绝，合法 SSR 输出完整尺寸', () => {
  // 运行时校验和错误文案由公共 utils/size.ts 的 mapResponsiveSize 统一提供。
  for (const size of ['foo', '', { md: 'lg' }, {}, { base: undefined }, { base: 'invalid' }]) {
    assert.throws(() => renderToStaticMarkup(h(api.Timeline, { size })), /base|未知尺寸/);
  }
  const markup = renderToStaticMarkup(h(api.Timeline, { size: { base: 'xs', md: 'lg' } }, event('首屏')));
  assert.match(markup, /--timeline-base-line-height:var\(--timeline-size-xs-line-height\)/);
  assert.match(markup, /--timeline-md-marker-size:var\(--timeline-size-lg-marker-size\)/);
});

test('纯 CSS 六项默认尺寸完整，所有主题的 line-height 均为有效长度', async () => {
  const outputs = await buildTokenFiles();
  const local = new Map();
  for (const css of [outputs.get('packages/ui-react/src/components/timeline/design.tokens.css'), await readFile(new URL('./tokens.css', import.meta.url), 'utf8')]) {
    postcss.parse(css).walkDecls(({ prop, value }) => local.set(prop, value));
  }
  for (const theme of ['light', 'dark']) {
    const variables = new Map(local);
    for (const [file, css] of outputs) if (file.startsWith(`packages/ui-react/src/components/themes/${theme}/`)) {
      postcss.parse(css).walkDecls(({ prop, value }) => variables.set(prop, value));
    }
    function resolve(name) {
      const value = variables.get(name);
      assert(value, `缺少 ${theme}/${name}`);
      const reference = /^var\((--[\w-]+)\)$/.exec(value);
      return reference ? resolve(reference[1]) : value;
    }
    for (const dimension of ['font-size', 'time-font-size', 'line-height', 'marker-size', 'gap', 'item-gap']) {
      assert.match(resolve(`--timeline-base-${dimension}`), /^\d+(\.\d+)?px$/);
    }
    for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
      assert.match(resolve(`--timeline-size-${size}-line-height`), /^\d+(\.\d+)?px$/);
    }
  }
});

test('Root 合并外部样式并保留其他尺寸变量，标题可指定原生层级', async () => {
  const list = await render(h(api.Timeline, {
    size: 'xs', style: { '--timeline-line-color': 'red', '--timeline-base-marker-size': '10px' },
  }, h(api.TimelineItem, null, h(api.TimelineContent, null, h(api.TimelineTitle, { headingLevel: 2 }, '进展')))));
  assert.equal(list.style.getPropertyValue('--timeline-line-color'), 'red');
  assert.equal(list.style.getPropertyValue('--timeline-base-marker-size'), '10px');
  assert.equal(list.style.getPropertyValue('--timeline-base-font-size'), 'var(--timeline-size-xs-font-size)');
  assert.equal(list.querySelector('.bkreact-timeline__title').tagName, 'H2');
  assert.equal(list.querySelector('h2').hasAttribute('headingLevel'), false);
});

test('独立 Item 使用默认 context，纵向旧 label 在开发环境提示', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', message => warnings.push(message));
  const item = await render(event('独立项目'));
  assert.equal(item.tagName, 'LI');
  assert.equal(item.dataset.layout, 'vertical');
  await render(h(api.Timeline, null, h(api.TimelineItem, null, h(api.TimelineMarker, { label: '旧标签' }))));
  assert(warnings.some(message => message.includes('label 仅横向布局可见')));
});

test('操作区不叠加 margin，末项去除尾部留白，单项横向两端连接线隐藏', async () => {
  const css = postcss.parse(await readFile(new URL('./styles.css', import.meta.url), 'utf8'));
  const rules = new Map();
  css.walkRules(rule => rules.set(rule.selector, Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))));
  assert.equal(rules.get('.bkreact-timeline__content').gap, 'var(--timeline-content-gap)');
  assert.equal(rules.get('.bkreact-timeline__action')?.['margin-block-start'], undefined);
  assert.equal(rules.get(".bkreact-timeline__item[data-layout='horizontal'][data-align='start']:last-child > .bkreact-timeline__content")['padding-inline-end'], 'var(--timeline-zero)');
  const lineRule = [...rules].find(([selector]) => selector.includes(':last-child > .bkreact-timeline__marker-group::after') && selector.includes(':first-child > .bkreact-timeline__marker-group::before'));
  assert.equal(lineRule[1].visibility, 'var(--timeline-hidden-visibility)');
  let list = await render(h(api.Timeline, { layout: 'horizontal', align: 'center' }, event('唯一项目')));
  assert.equal(list.children.length, 1);
  list = await render(h(api.Timeline, { layout: 'horizontal' }));
  assert.equal(list.children.length, 0);
});

test('两种主题的 pending 和 active 步骤文字均有足够对比度', async () => {
  const model = await buildTokenModel({ sourceDir: fileURLToPath(new URL('../../../../../source/', import.meta.url)) });
  function luminance(hex) {
    const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const [name, theme] of Object.entries(model.themes)) {
    for (const [bg, text] of [['step-pending-color', 'step-pending-text-color'], ['step-active-color', 'step-text-color']]) {
      const a = luminance(theme.resolved.get(`components.timeline.base.${bg}`));
      const b = luminance(theme.resolved.get(`components.timeline.base.${text}`));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert(ratio >= 4.5, `${name}/${bg}: ${ratio}`);
    }
  }
});
