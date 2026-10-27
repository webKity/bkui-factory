import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { compile } from 'react-native-css/compiler';
import { evaluateTokenModule } from './token-test-utils.mjs';
import { buildTokenFiles } from './generate-theme-tokens.mjs';

test('NativeWind V5 将实际组件工具类编译为原生样式，并保留运行时变量', async () => {
  const source = fileURLToPath(new URL('../packages/ui-native/src/styles.css', import.meta.url));
  const css = await postcss([tailwind()]).process((await readFile(source, 'utf8')) + '\n@source inline("bg-bk-action-primary text-bk-text-primary rounded-bk-scale-md text-bk-base");', { from: source });
  const result = compile(css.css, { inlineVariables: false });
  const sheet = result.stylesheet();
  const rules = new Map(sheet.s);
  for (const name of ['bg-[var(--bk-button-bg)]', 'min-h-[var(--bk-button-height)]', 'text-[length:var(--bk-button-font-size)]', 'h-[var(--bk-loading-size)]', 'bg-bk-action-primary', 'text-bk-text-primary', 'rounded-bk-scale-md', 'text-bk-base']) assert(rules.has(name), `未编译工具类：${name}`);
  assert(JSON.stringify(rules.get('bg-[var(--bk-button-bg)]')).includes('bk-button-bg'));
  assert(JSON.stringify(rules.get('bg-bk-action-primary')).includes('bk-semantic-color-action-primary'));
  assert(JSON.stringify(rules.get('text-bk-base')).includes('bk-semantic-text-base-size'));
});

test('全局只生成基础主题和语义变量，组件设计值只写入组件目录', async () => {
  const files = await buildTokenFiles();
  const { themes, themeVariables: variables } = await evaluateTokenModule(files.get('packages/ui-native/src/components/themes/tokens.ts'));
  const { tokens: button } = await evaluateTokenModule(files.get('packages/ui-native/src/components/button/design.tokens.ts'));
  const { tokens: loading } = await evaluateTokenModule(files.get('packages/ui-native/src/components/loading/design.tokens.ts'));
  for (const [name, theme] of Object.entries(themes)) {
    assert(!Object.hasOwn(theme, 'components'));
    assert.equal(button[name].sizes.base.height, 40);
    assert.equal(loading[name].sizes.base, 20);
    assert.equal(variables[name]['--bk-semantic-text-base-size'], `${theme.semantic['text-base-size']}px`);
    assert(Object.keys(variables[name]).every(key => key.startsWith('--bk-semantic-')));
  }
  const css = files.get('packages/ui-native/src/components/themes/tokens.css');
  assert(!css.includes('--bk-components-'));
  assert([...files.keys()].every(file => !file.includes('packages/tokens')));
  assert.notEqual(variables.light['--bk-semantic-color-surface-page'], variables.dark['--bk-semantic-color-surface-page']);
});
