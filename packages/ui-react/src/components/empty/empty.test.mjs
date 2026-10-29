import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { act, createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { getIconDefinition } from '@bkreact/assets/icons';

let Empty, temporary;
const directory = fileURLToPath(new URL('./', import.meta.url));

before(async () => {
  const output = fileURLToPath(new URL('../../../../../.test-output/', import.meta.url));
  await mkdir(output, { recursive: true });
  temporary = await mkdtemp(`${output}empty-`);
  const result = await build({
    entryPoints: [`${directory}index.tsx`],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    write: false,
  });
  await writeFile(`${temporary}/empty.mjs`, result.outputFiles[0].contents);
  ({ Empty } = await import(`${temporary}/empty.mjs`));
});

after(async () => {
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

function render(props) {
  return new JSDOM(renderToStaticMarkup(h(Empty, props))).window.document;
}

test('default state renders description and a decorative illustration during SSR', () => {
  const doc = render({});
  assert.equal(doc.querySelector('.bkreact-empty__description').textContent, '暂无数据');
  assert.equal(doc.querySelector('svg').getAttribute('aria-hidden'), 'true');
  assert.equal(doc.querySelector('.bkreact-empty__image').getAttribute('aria-hidden'), 'true');
  assert.ok(doc.querySelector('.bkreact-empty__image > .bkreact-icon'));
  assert.equal(doc.querySelector('svg path').getAttribute('d'), getIconDefinition('empty').paths[0].d);
  assert.equal(doc.querySelector('.bkreact-empty').dataset.size, 'base');
  assert.equal(doc.querySelector('.bkreact-empty__actions'), null);
});

test('URL images use empty alt text; custom nodes keep their semantics', () => {
  const doc = render({ image: '/empty.svg' });
  assert.equal(doc.querySelector('img').getAttribute('src'), '/empty.svg');
  assert.equal(doc.querySelector('img').alt, '');
  assert.equal(doc.querySelector('svg'), null);
  const custom = render({ image: h('svg', { role: 'img', 'aria-label': '自定义插图' }) });
  assert.equal(custom.querySelector('[role="img"]').getAttribute('aria-label'), '自定义插图');
  assert.equal(custom.querySelector('.bkreact-empty__image').hasAttribute('aria-hidden'), false);
});

test('explicit empty values hide slots while numeric descriptions remain visible', () => {
  for (const value of [null, false, '', ' ', '\n\t', ['', false, ' ']]) {
    const doc = render({ image: value, description: value, children: value });
    assert.equal(doc.querySelector('.bkreact-empty').children.length, 0);
  }
  assert.equal(render({ description: 0 }).querySelector('.bkreact-empty__description').textContent, '0');
  assert.equal(render({ children: 0 }).querySelector('.bkreact-empty__actions').textContent, '0');
  assert.equal(render({ children: '' }).querySelector('.bkreact-empty__actions'), null);
  assert.equal(render({ image: '  /empty.svg  ' }).querySelector('img').getAttribute('src'), '/empty.svg');
});

test('fixed sizes reference local tokens and user attributes cannot activate extra size scopes', () => {
  const el = render({
    size: 'lg', 'data-size': 'xs', 'data-size-sm': true, 'data-size-custom': true,
    'data-testid': 'empty',
  }).querySelector('.bkreact-empty');
  assert.equal(el.dataset.size, 'lg');
  assert.equal(el.style.getPropertyValue('--empty-base-image-width'), 'var(--empty-size-lg-image-width)');
  assert.equal(el.hasAttribute('data-size-sm'), false);
  assert.equal(el.hasAttribute('data-size-custom'), false);
  assert.equal(el.getAttribute('data-testid'), 'empty');
});

test('responsive sizes use local token references and only mark configured breakpoints', () => {
  const el = render({ size: { base: 'xs', md: 'lg', '2xl': '2xl' } }).querySelector('.bkreact-empty');
  assert.equal(el.dataset.size, 'responsive');
  assert.equal(el.getAttribute('data-size-md'), 'true');
  assert.equal(el.hasAttribute('data-size-sm'), false);
  assert.equal(el.style.getPropertyValue('--empty-base-image-width'), 'var(--empty-size-xs-image-width)');
  assert.equal(el.style.getPropertyValue('--empty-md-image-width'), 'var(--empty-size-lg-image-width)');
  assert.equal(el.style.getPropertyValue('--empty-2xl-font-size'), 'var(--empty-size-2xl-font-size)');
});

test('invalid sizes preserve the shared strict contract with component name and repair guidance', () => {
  for (const size of [null, { md: 'lg' }, 'invalid', { base: 'base', md: 'invalid' }, { base: 'base', tablet: 'lg' }]) {
    assert.throws(() => render({ size }), error => {
      assert.match(error.message, /^\[Empty\]/);
      assert.match(error.message, /size="base"/);
      assert.match(error.message, /base: 'base'/);
      assert.ok(error.cause instanceof Error);
      return true;
    });
  }
});

test('image-only documentation demonstrates an accessible named image', async () => {
  const doc = render({ description: null, role: 'img', 'aria-label': '暂无数据' });
  const el = doc.querySelector('.bkreact-empty');
  assert.equal(el.getAttribute('role'), 'img');
  assert.equal(el.getAttribute('aria-label'), '暂无数据');
  assert.equal(doc.querySelector('.bkreact-empty__image').getAttribute('aria-hidden'), 'true');
  const story = await readFile(`${directory}Empty.stories.tsx`, 'utf8');
  assert.match(story, /ImageOnly[\s\S]*?role: 'img'/);
});

test('root forwards refs, attributes and events; action buttons remain interactive', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
  const names = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    const ref = createRef();
    let clicks = 0;
    await act(() => root.render(h(Empty, {
      ref, id: 'empty', className: 'custom', role: 'status', 'aria-live': 'polite',
      style: { color: 'red' },
      children: h('button', { onClick: () => clicks++ }, '重试'),
    })));
    assert.equal(ref.current, document.getElementById('empty'));
    assert.equal(ref.current.classList.contains('custom'), true);
    assert.equal(ref.current.getAttribute('aria-live'), 'polite');
    assert.equal(ref.current.getAttribute('role'), 'status');
    assert.equal(ref.current.style.color, '');
    await act(() => ref.current.querySelector('button').click());
    assert.equal(clicks, 1);
  } finally {
    if (root) await act(() => root.unmount());
    dom.window.close();
    for (const name of names) {
      if (previous.get(name)) Object.defineProperty(globalThis, name, previous.get(name));
      else delete globalThis[name];
    }
    if (previousAct === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    else globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});

test('all consumed tokens are declared and CSS breakpoints match the shared size contract', async () => {
  const files = await Promise.all(['design.tokens.css', 'tokens.css', 'styles.css'].map(name => readFile(`${directory}${name}`, 'utf8')));
  const declared = new Set();
  for (const css of files.slice(0, 2)) postcss.parse(css).walkDecls(decl => declared.add(decl.prop));
  for (const match of files[2].matchAll(/var\((--empty-[\w-]+)\)/g)) {
    // Breakpoint variables are supplied by size.ts rather than tokens.css.
    assert.ok(declared.has(match[1]) || /^--empty-(sm|md|lg|xl|2xl)-/.test(match[1]), match[1]);
  }
  const sizeSource = await readFile(`${directory}../utils/size.ts`, 'utf8');
  postcss.parse(files[2]).walkAtRules('media', rule => {
    const width = rule.params.match(/min-width: (\d+)rem/)[1];
    const scope = rule.nodes[0].selector.match(/data-size-([^\]]+)/)[1];
    assert.match(sizeSource, new RegExp(`['"]?${scope}['"]?: ${width}`));
  });
  for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
    for (const dimension of ['font-size', 'line-height', 'image-width', 'image-height', 'gap', 'padding-y']) {
      assert.ok(declared.has(`--empty-size-${size}-${dimension}`));
    }
  }
});
