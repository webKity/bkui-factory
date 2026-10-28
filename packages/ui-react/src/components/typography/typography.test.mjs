import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

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

test('原生属性、ref、自定义 token、preLine 和稀疏响应式尺寸', async () => {
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
    assert.equal(element.style.getPropertyValue('--typography-color'), 'red');
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

test('生成的插件 CSS 只包含私有排版类，保留嵌入内容排除规则并映射全部颜色', async () => {
  const css = postcss.parse(await readFile(new URL('plugin.css', directory), 'utf8'));
  assert.equal(css.nodes.filter(node => node.type === 'rule').length, 1);
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
  for (const theme of ['light', 'dark']) {
    const semantic = new Map();
    postcss.parse(await readFile(new URL(`../themes/${theme}/semantic/typography.css`, directory), 'utf8'))
      .walkDecls(d => semantic.set(d.prop, parseFloat(d.value)));
    for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
      const html = renderToStaticMarkup(h(Typography, { size }, h('h1', {}, '标题')));
      assert(html.includes(`--typography-base-heading-scale:var(--typography-size-${size}-heading-scale)`));
      const scale = Number(values.get(`--typography-size-${size}-heading-scale`));
      assert.equal(scale, semantic.get(`--text-${size}-size`) / semantic.get('--text-base-size'));
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
  assert.equal(Number(tokens.get('--typography-lead-scale')), 1.25);
  assert.equal(Number(tokens.get('--typography-lead-line-height')), 1.6);
  const css = postcss.parse(await readFile(new URL('plugin.css', directory), 'utf8'));
  let lead;
  css.walkRules(rule => {
    if (rule.selector.startsWith(':where([class~="lead"])')) lead = rule;
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
