import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { transform } from 'lightningcss';

const directory = new URL('./', import.meta.url);
let temporary, Typography;
before(async () => {
  await mkdir(new URL('../../../../../.test-output/', directory), { recursive: true });
  temporary = await mkdtemp(fileURLToPath(new URL('../../../../../.test-output/typography-', directory)));
  const result = await build({
    entryPoints: [fileURLToPath(new URL('index.tsx', directory))],
    bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, write: false,
  });
  const entry = `${temporary}/typography.mjs`;
  await writeFile(entry, result.outputFiles[0].contents);
  ({ Typography } = await import(entry));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

test('原生属性、ref、忽略外部 style、preLine 和稀疏响应式尺寸', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const globals = ['window', 'document', 'navigator'];
  const previous = globals.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.querySelector('#root'));
  try {
    const ref = createRef();
    let clicks = 0;
    await act(() => root.render(h(Typography, {
      as: 'article', ref, id: 'article', className: 'custom', preLine: true,
      size: { base: 'xs', lg: 'xl' }, onClick: () => clicks++,
      style: { '--typography-color': 'red' }, 'aria-label': '说明',
    }, '第一行\n第二行')));
    const element = ref.current;
    assert.equal(element.tagName, 'ARTICLE');
    assert.equal(element.id, 'article');
    assert.equal(element.className, 'bk-typography custom');
    assert.equal(element.getAttribute('aria-label'), '说明');
    assert.equal(element.style.getPropertyValue('--typography-color'), '');
    assert.equal(element.style.getPropertyValue('--typography-base-font-size'), 'var(--typography-size-xs-font-size)');
    assert.equal(element.style.getPropertyValue('--typography-lg-line-height'), 'var(--typography-size-xl-line-height)');
    assert.equal(element.style.getPropertyValue('--typography-base-heading-scale'), 'var(--typography-size-xs-heading-scale)');
    assert.equal(element.style.getPropertyValue('--typography-lg-heading-scale'), 'var(--typography-size-xl-heading-scale)');
    assert(element.hasAttribute('data-size-lg'));
    assert(!element.hasAttribute('data-size-md'));
    assert(element.hasAttribute('data-pre-line'));
    assert(!element.hasAttribute('preLine'));
    element.click();
    assert.equal(clicks, 1);
    await act(() => root.render(h(Typography, {}, '默认正文')));
    const defaults = dom.window.document.querySelector('.bk-typography');
    assert.equal(defaults.tagName, 'DIV');
    assert.equal(defaults.dataset.size, 'base');
    assert(!defaults.hasAttribute('data-pre-line'));
    await act(() => root.render(h(Typography, { as: 'svg', ref, viewBox: '0 0 16 16' }, h('title', {}, 'SVG'))));
    assert(ref.current instanceof dom.window.SVGElement);
    assert.equal(ref.current.getAttribute('viewBox'), '0 0 16 16');
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    globals.forEach((name, index) => {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]);
      else delete globalThis[name];
    });
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('生成的插件 CSS 已展开嵌套，只包含私有排版规则并保留嵌入内容排除规则', async () => {
  const css = postcss.parse(await readFile(new URL('plugin.css', directory), 'utf8'));
  css.walkRules(rule => {
    assert.equal(rule.parent.type, 'root', '分发 CSS 不应包含嵌套规则');
    assert(rule.selector.startsWith('.bk-typography'));
  });
  assert.equal(css.nodes.find(node => node.type === 'rule').selector, '.bk-typography');
  assert.match(css.toString(), /not-bk-typography/);
  css.walkDecls(/^--tw-prose-/, declaration => {
    assert.match(declaration.value, /^var\(--typography-[\w-]+\)$/);
  });
  for (let level = 1; level <= 6; level++) assert.match(css.toString(), new RegExp(`var\\(--typography-h${level}-font-size\\)`));
});

test('七档 size 同时缩放六级标题的字号与行高，响应式断点同步切换', async () => {
  const tokens = postcss.parse(await readFile(new URL('tokens.css', directory), 'utf8'));
  const values = new Map();
  tokens.walkDecls(d => values.set(d.prop, d.value));
  let previousScale = 0;
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    const html = renderToStaticMarkup(h(Typography, { size }, h('h1', {}, '标题')));
    assert(html.includes(`--typography-base-heading-scale:var(--typography-size-${size}-heading-scale)`));
    const scale = Number(values.get(`--typography-size-${size}-heading-scale`));
    assert(Number.isFinite(scale) && scale > previousScale, '标题设计比例应随尺寸递增');
    previousScale = scale;
  }
  for (const theme of ['light', 'dark']) {
    const semantic = new Map();
    postcss.parse(await readFile(new URL(`../themes/${theme}/semantic/typography.css`, directory), 'utf8'))
      .walkDecls(d => semantic.set(d.prop, d.value));
    for (let level = 1; level <= 6; level++) {
      assert.match(semantic.get(`--h-h${level}-size`), /^\d+(\.\d+)?px$/);
      assert.match(semantic.get(`--h-h${level}-line-height`), /^\d+(\.\d+)?px$/, '只有长度行高才可与字号等比缩放');
    }
  }
  for (let level = 1; level <= 6; level++) {
    assert.equal(values.get(`--typography-h${level}-font-size`), `calc(var(--h-h${level}-size) * var(--typography-heading-scale))`);
    assert.equal(values.get(`--typography-h${level}-line-height`), `calc(var(--h-h${level}-line-height) * var(--typography-heading-scale))`);
  }
  const styles = postcss.parse(await readFile(new URL('styles.css', directory), 'utf8'));
  for (const [breakpoint, width] of [['sm', 40], ['md', 48], ['lg', 64], ['xl', 80], ['2xl', 96]]) {
    let declaration;
    styles.walkAtRules('media', rule => {
      if (rule.params === `(min-width: ${width}rem)`) rule.walkDecls('--typography-heading-scale', d => { declaration = d; });
    });
    assert.equal(declaration?.parent.selector, `.bk-typography[data-size-${breakpoint}]`);
    assert.equal(declaration?.value, `var(--typography-${breakpoint}-heading-scale)`);
  }
});

test('lead 显式读取当前 size 字号，使用无单位行高并保留排除规则', async () => {
  const tokens = new Map();
  postcss.parse(await readFile(new URL('tokens.css', directory), 'utf8')).walkDecls(d => tokens.set(d.prop, d.value));
  assert.equal(tokens.get('--typography-lead-font-size'), 'calc(var(--typography-font-size) * var(--typography-lead-scale))');
  assert.equal(Number(tokens.get('--typography-lead-scale')), 1.1);
  assert.equal(Number(tokens.get('--typography-lead-line-height')), 1.6);
  const css = postcss.parse(await readFile(new URL('plugin.css', directory), 'utf8'));
  let lead;
  css.walkRules(rule => {
    if (rule.selector.startsWith('.bk-typography :where([class~="lead"])')) lead = rule;
  });
  assert(lead);
  assert.match(lead.selector, /not-bk-typography/);
  const declarations = new Map(lead.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(declarations.get('font-size'), 'var(--typography-lead-font-size)');
  assert.equal(declarations.get('line-height'), 'var(--typography-lead-line-height)');
});

test('所有主题映射均有效，局部 token 引用完整', async () => {
  const files = ['tokens.css', 'styles.css', 'plugin.css'];
  const css = postcss.parse((await Promise.all(files.map(file => readFile(new URL(file, directory), 'utf8')))).join('\n'));
  const declared = new Set();
  css.walkDecls(declaration => declared.add(declaration.prop));
  for (const scope of ['base', 'sm', 'md', 'lg', 'xl', '2xl']) {
    for (const dimension of ['font-size', 'line-height', 'heading-scale']) declared.add(`--typography-${scope}-${dimension}`);
  }
  for (const theme of ['light', 'dark']) {
    const semantic = new URL(`../themes/${theme}/semantic/`, directory);
    const names = new Set();
    for (const file of await readdir(semantic)) {
      if (file.endsWith('.css')) postcss.parse(await readFile(new URL(file, semantic), 'utf8')).walkDecls(d => names.add(d.prop));
    }
    css.walkDecls(declaration => {
      for (const [, name] of declaration.value.matchAll(/var\((--[\w-]+)/g)) {
        assert(declared.has(name) || names.has(name), `${theme}: 未定义的 token ${name}`);
      }
    });
  }
});

test('字符串 size 只设置基础 token；响应式 size 只标记显式断点，缺失 base 会报错', () => {
  const dom = new JSDOM(renderToStaticMarkup(h(Typography, { size: 'sm' })));
  try {
    const element = dom.window.document.querySelector('.bk-typography');
    assert.equal(element.dataset.size, 'sm');
    assert.equal(element.style.getPropertyValue('--typography-base-font-size'), 'var(--typography-size-sm-font-size)');
    for (const scope of ['base', 'sm', 'md', 'lg', 'xl', '2xl']) assert(!element.hasAttribute(`data-size-${scope}`));
    const html = renderToStaticMarkup(h(Typography, { size: { base: 'xs', lg: 'xl' } }));
    element.outerHTML = html;
    const responsive = dom.window.document.querySelector('.bk-typography');
    assert.equal(responsive.dataset.size, 'responsive');
    assert(responsive.hasAttribute('data-size-lg'));
    assert(!responsive.hasAttribute('data-size-base'));
    assert(!responsive.hasAttribute('data-size-sm'));
    assert.throws(() => renderToStaticMarkup(h(Typography, { size: { sm: 'lg' } })), /必须显式提供 base/);
  } finally {
    dom.window.close();
  }
});

test('kbd 阴影在两种主题中均为合法 box-shadow，代码块使用语义颜色', async () => {
  const plugin = postcss.parse(await readFile(new URL('plugin.css', directory), 'utf8'));
  const tokens = postcss.parse(await readFile(new URL('tokens.css', directory), 'utf8'));
  let shadow, kbdFont, rootColor;
  plugin.walkRules(rule => {
    if (rule.selector === '.bk-typography') rule.walkDecls('color', d => { rootColor = d.value; });
    if (rule.selector.startsWith('.bk-typography :where(kbd)')) {
      rule.walkDecls('box-shadow', d => { shadow = d.value; });
      rule.walkDecls('font-family', d => { kbdFont = d.value; });
    }
  });
  assert(shadow);
  assert.equal(kbdFont, 'var(--typography-kbd-font-family)');
  assert.equal(rootColor, 'var(--tw-prose-body)', 'body token 应参与正文颜色计算');
  const values = new Map();
  tokens.walkDecls(d => values.set(d.prop, d.value));
  assert.equal(values.get('--typography-kbd-font-family'), 'var(--typography-font-family)');
  assert.equal(values.get('--typography-pre-code'), 'var(--color-text-body)');
  assert.equal(values.get('--typography-pre-bg'), 'var(--color-fill-subtle)');
  const themeShadows = [];
  for (const theme of ['light', 'dark']) {
    const variables = new Map(values);
    for (const file of ['primitive/colors.css', 'semantic/colors.css']) {
      const css = postcss.parse(await readFile(new URL(`../themes/${theme}/${file}`, directory), 'utf8'));
      css.walkDecls(d => variables.set(d.prop, d.value));
    }
    plugin.walkDecls(/^--tw-prose-/, d => variables.set(d.prop, d.value));
    function resolve(value, seen = new Set()) {
      return value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
        assert(!seen.has(name), `循环引用 ${name}`);
        assert(variables.has(name), `缺少变量 ${name}`);
        return resolve(variables.get(name), new Set([...seen, name]));
      });
    }
    const computed = resolve(shadow);
    assert.doesNotMatch(computed, /var\(/);
    const parsed = transform({ filename: 'kbd.css', code: Buffer.from(`kbd { box-shadow: ${computed}; }`) });
    assert.deepEqual(parsed.warnings, []);
    assert.match(parsed.code.toString(), /box-shadow:/);
    themeShadows.push(computed);
  }
  assert.notEqual(themeShadows[0], themeShadows[1], '阴影颜色应随明暗主题变化');
});
