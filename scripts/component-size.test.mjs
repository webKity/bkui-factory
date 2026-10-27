import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import postcss from 'postcss';

async function load(relativePath) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))], bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false, alias: { 'react-native': 'react-native-web' } });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, createRequire(import.meta.url));
  return module.exports;
}
const web = await load('../packages/ui-react/src/components/utils/size.ts');
const native = await load('../packages/ui-native/src/components/utils/size.ts');
const { getButtonSizeStyle } = await load('../packages/ui-react/src/components/button/size.ts');
const { getLoadingSizeStyle } = await load('../packages/ui-react/src/components/loading/size.ts');

test('两端拒绝缺少 base、无效档位和未知断点，不生成默认尺寸补丁', () => {
  for (const api of [web, native]) {
    for (const size of [{}, { sm: 'xs' }, null, []]) assert.throws(() => api.mapResponsiveSize(size, () => {}), /base/);
    for (const size of ['unknown', { base: 'base', xl: 'missing' }, { base: undefined }]) assert.throws(() => api.mapResponsiveSize(size, () => {}), /未知尺寸/);
    assert.throws(() => api.mapResponsiveSize({ base: 'base', '3xl': 'lg' }, () => {}), /未知断点/);
  }
  assert.throws(() => getButtonSizeStyle('missing'), /未知尺寸/);
  assert.throws(() => getLoadingSizeStyle('missing'), /未知尺寸/);
  for (const size of [-1, NaN, Infinity]) assert.throws(() => getLoadingSizeStyle(size), /非负有限数值/);
});

test('响应式只为声明过的断点生成引用，Web 与 RN 切换行为一致', () => {
  const size = { base: 'sm', md: 'lg', xl: '2xl' };
  const style = getButtonSizeStyle(size);
  assert.equal(style['--button-base-height'], 'var(--button-size-sm-height)');
  assert.equal(style['--button-md-height'], 'var(--button-size-lg-height)');
  assert(!Object.hasOwn(style, '--button-sm-height'));
  assert(!Object.hasOwn(style, '--button-lg-height'));
  assert.deepEqual(web.getResponsiveSizeAttributes(size), { 'data-size-md': true, 'data-size-xl': true });
  for (const [width, expected] of [[0, 'sm'], [640, 'sm'], [768, 'lg'], [1024, 'lg'], [1280, '2xl'], [1536, '2xl']]) assert.equal(native.resolveResponsiveSize(size, width), expected);
});

test('组件 CSS 不使用 var() 默认值隐藏缺失的样式变量', async () => {
  for (const component of ['button', 'loading', 'icon']) {
    const dir = new URL(`../packages/ui-react/src/components/${component}/`, import.meta.url);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.css')) continue;
      postcss.parse(await readFile(new URL(file, dir), 'utf8')).walkDecls(declaration => {
        assert.doesNotMatch(declaration.value, /var\(\s*--[\w-]+\s*,/, `${component}/${file}：${declaration.prop}`);
      });
    }
  }
});
