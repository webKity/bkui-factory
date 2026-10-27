import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import postcss from 'postcss';
import { buildTokenFiles, generateTokens } from './generate-theme-tokens.mjs';
import { build } from 'esbuild';
import { evaluateTokenModule } from './token-test-utils.mjs';

const bundle = await build({ entryPoints: [new URL('../packages/ui-native/src/components/button/tokens.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'cjs', write: false });
const buttonModule = { exports: {} };
new Function('module', 'exports', bundle.outputFiles[0].text)(buttonModule, buttonModule.exports);
const { resolveButtonTokens } = buttonModule.exports;

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const targetRoot = await mkdtemp(path.join(tmpdir(), 'bkui-cross-platform-'));
  t.after(() => rm(targetRoot, { recursive: true, force: true }));
  const sourceDir = path.join(targetRoot, 'source');
  await cp(path.join(root, 'source'), sourceDir, { recursive: true });
  return { sourceDir, targetRoot, quiet: true };
}
async function editComponent(options, edit) {
  const file = path.join(options.sourceDir, 'components/button.tokens.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  edit(data);
  await writeFile(file, JSON.stringify(data));
}
async function native(outputs) {
  const { themes } = await evaluateTokenModule(outputs.get('packages/ui-native/src/components/themes/tokens.ts'));
  const { tokens: button } = await evaluateTokenModule(outputs.get('packages/ui-native/src/components/button/design.tokens.ts'));
  // Assemble only inside tests to compare component values with foundation references.
  return Object.fromEntries(Object.entries(themes).map(([name, theme]) => [name, { ...theme, components: { button: button[name] } }]));
}

test('同一设计源生成 Web 引用与 RN 解析值，两端所有组件 token 一致', async () => {
  const outputs = await buildTokenFiles();
  const themes = await native(outputs);
  for (const name of ['light', 'dark']) {
    const theme = themes[name];
    assert.equal(theme.components.button.base['border-radius'], theme.semantic['radius-scale-md']);
    assert.equal(theme.components.button.sizes.base['font-size'], 16);
    assert.equal(theme.components.button.sizes.base.height, 40);
    assert.equal(theme.components.button.intents.brand['tone-bg'], theme.semantic['color-action-primary']);
    assert(!JSON.stringify(theme).includes('var('));
    assert(!JSON.stringify(theme).includes('px'));
    const variables = new Map();
    for (const [file, contents] of outputs) {
      if (file.startsWith(`packages/ui-react/src/components/themes/${name}/`) && !file.endsWith('index.css')) {
        postcss.parse(contents).walkDecls(d => variables.set(d.prop, d.value));
      }
    }
    postcss.parse(outputs.get('packages/ui-react/src/components/button/design.tokens.css')).walkRules(rule => {
      const intent = /data-intent='([^']+)'/.exec(rule.selector)?.[1];
      rule.walkDecls(d => {
        let value = d.value;
        const seen = new Set();
        while (/^var\((--[^)]+)\)$/.test(value)) {
          const key = /^var\((--[^)]+)\)$/.exec(value)[1];
          assert(!seen.has(key)); seen.add(key);
          assert(variables.has(key), key); value = variables.get(key);
        }
        const prop = d.prop.slice('--button-'.length);
        const size = /^size-(2xs|xs|sm|base|lg|xl|2xl)-(.*)$/.exec(prop);
        const expected = size ? theme.components.button.sizes[size[1]][size[2]]
          : intent ? theme.components.button.intents[intent][prop] : theme.components.button.base[prop];
        assert.equal(typeof expected === 'number' ? Number(value.replace(/px$/, '')) : value, expected, `${name}/${d.prop}`);
      });
    });
  }
  assert.notEqual(themes.light.components.button.base['tone-bg'], themes.dark.components.button.base['tone-bg']);
  await generateTokens({ check: true, quiet: true });
});

test('primitive 修改传播至 Web 引用及 RN 组件，不使用 Figma 的陈旧已解析值', async t => {
  const options = await fixture(t);
  const initial = await native(await buildTokenFiles(options));
  const semantic = JSON.parse(await readFile(path.join(options.sourceDir, 'semantic/light/colors.tokens.json'), 'utf8'));
  const alias = semantic.action.primary.$extensions['com.figma.aliasData'].targetVariableName;
  const file = path.join(options.sourceDir, 'primitives/light/ colors.tokens.json');
  const primitives = JSON.parse(await readFile(file, 'utf8'));
  function replace(group, prefix = []) {
    for (const [name, value] of Object.entries(group)) {
      if (name.startsWith('$')) continue;
      const names = [...prefix, name];
      if ('$value' in value && names.join('-') === alias) value.$value = '#123456';
      else if (!('$value' in value)) replace(value, names);
    }
  }
  replace(primitives);
  await writeFile(file, JSON.stringify(primitives));
  const outputs = await buildTokenFiles(options);
  const changed = await native(outputs);
  assert.equal(changed.light.components.button.intents.brand['tone-bg'], '#123456');
  assert.deepEqual(changed.dark, initial.dark);
});

test('组件引用支持链式解析；缺失、循环、类型错误、非法单位均在写入前拒绝', async t => {
  const options = await fixture(t);
  await editComponent(options, data => {
    data.base['test-number'] = { $type: 'dimension', $value: '{components.button.base.border-width}' };
  });
  assert.equal((await native(await buildTokenFiles(options))).light.components.button.base['test-number'], 1);
  for (const [value, type, error] of [
    ['{semantic.missing}', 'color', /找不到 token/],
    ['{components.button.base.test-number}', 'dimension', /循环引用/],
    ['{semantic.color-action-primary}', 'number', /引用类型不匹配/],
    [{ value: 2, unit: 'rem' }, 'dimension', /有限 px 数值/],
  ]) {
    await editComponent(options, data => { data.base['test-number'] = { $type: type, $value: value }; });
    await assert.rejects(generateTokens(options), error);
    await assert.rejects(readFile(path.join(options.targetRoot, 'packages/ui-native/src/components/themes/tokens.ts')), { code: 'ENOENT' });
  }
});

test('check 检查 RN 产物以及移除组件后的遗留 CSS，且不写文件', async t => {
  const options = await fixture(t);
  await generateTokens(options);
  const file = path.join(options.targetRoot, 'packages/ui-native/src/components/themes/tokens.ts');
  await writeFile(file, 'changed');
  const extra = path.join(options.targetRoot, 'packages/ui-react/src/components/old/design.tokens.css');
  await mkdir(path.dirname(extra), { recursive: true });
  await writeFile(extra, '/* Generated by npm run tokens:build; do not edit. */');
  await assert.rejects(generateTokens({ ...options, check: true }), error => {
    assert.match(error.message, /内容不同：packages\/ui-native\/src\/components\/themes\/tokens.ts/);
    assert.match(error.message, /多余文件：.*old\/design.tokens.css/);
    return true;
  });
  assert.equal(await readFile(file, 'utf8'), 'changed');
});

test('RN 状态组合保持 intent 色彩，loading 阻止交互时不变成 disabled 灰色', async () => {
  const themes = await native(await buildTokenFiles());
  for (const [mode, theme] of Object.entries(themes)) {
    for (const intent of ['normal', 'brand', 'success', 'warning', 'danger']) {
      for (const variant of ['fill', 'outline', 'ghost']) {
        for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
          const normal = resolveButtonTokens(mode, { intent, variant, size });
          const loading = resolveButtonTokens(mode, { intent, variant, size, loading: true });
          const disabled = resolveButtonTokens(mode, { intent, variant, size, disabled: true, loading: true });
          assert.equal(normal.height, theme.components.button.sizes[size].height);
          assert.equal(loading.color, normal.color);
          assert.equal(disabled.color, theme.components.button.base['disabled-color']);
          assert.equal(loading.opacity, theme.components.button.base['loading-opacity']);
          assert.equal(disabled.opacity, theme.components.button.base['disabled-opacity']);
          if (variant === 'ghost') assert.equal(disabled.borderColor, 'transparent');
        }
      }
    }
    const token = resolveButtonTokens(mode, { intent: 'brand', pressed: true });
    assert.equal(token.background, theme.components.button.intents.brand['tone-active-bg']);
  }
});

test('修改单个组件只更新该组件两端产物，不污染全局主题或其他组件', async t => {
  const options = await fixture(t);
  const before = await buildTokenFiles(options);
  await editComponent(options, data => { data.base['border-width'].$value = { value: 3, unit: 'px' }; });
  const after = await buildTokenFiles(options);
  const changed = [...after.keys()].filter(file => before.get(file) !== after.get(file));
  assert.deepEqual(changed.sort(), [
    'packages/ui-native/src/components/button/design.tokens.ts',
    'packages/ui-react/src/components/button/design.tokens.css',
  ]);
});

test('缺少任一组件尺寸或维度时，报告源文件和 token 路径并阻止写入', async t => {
  const options = await fixture(t);
  const buttonFile = path.join(options.sourceDir, 'components/button.tokens.json');
  const original = await readFile(buttonFile, 'utf8');
  for (const [edit, missing] of [
    [data => { delete data.sizes.xl['fixed-width']; }, 'components.button.sizes.xl.fixed-width'],
    [data => { delete data.sizes.xl.height; }, 'components.button.sizes.xl.height'],
    [data => { delete data.sizes.xs; }, 'components.button.sizes.xs.height'],
    [data => { delete data.sizes.base['font-size']; }, 'components.button.sizes.base.font-size'],
  ]) {
    await writeFile(buttonFile, original);
    await editComponent(options, edit);
    await assert.rejects(generateTokens(options), error => {
      assert(error.message.includes('button.tokens.json'));
      assert(error.message.includes(missing));
      assert(error.message.includes('缺少尺寸 token'));
      return true;
    });
  }
  await writeFile(buttonFile, original);
  const loadingFile = path.join(options.sourceDir, 'components/loading.tokens.json');
  const loading = JSON.parse(await readFile(loadingFile, 'utf8'));
  delete loading.sizes['2xl'];
  await writeFile(loadingFile, JSON.stringify(loading));
  await assert.rejects(generateTokens(options), /loading.tokens.json.*缺少尺寸 token components.loading.sizes.2xl/);
  await assert.rejects(readFile(path.join(options.targetRoot, 'packages/ui-native/src/components/themes/tokens.ts')), { code: 'ENOENT' });
});
