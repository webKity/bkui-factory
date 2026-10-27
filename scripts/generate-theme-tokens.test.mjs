import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import postcss from 'postcss';
import { buildThemeFiles, generateThemes } from './generate-theme-tokens.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = path.join(projectRoot, 'source');

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'bkui-tokens-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceDir = path.join(directory, 'source');
  const targetDir = path.join(directory, 'themes');
  await cp(sourceDirectory, sourceDir, { recursive: true });
  return { sourceDir, targetDir, quiet: true };
}

async function writeJson(directory, relativePath, data) {
  const file = path.join(directory, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
}

function leaves(group, names = [], result = []) {
  if (Object.hasOwn(group, '$value')) result.push({ name: names.join('-').toLowerCase(), ...group });
  else for (const [name, child] of Object.entries(group)) {
    if (!name.startsWith('$')) leaves(child, [...names, name], result);
  }
  return result;
}

async function sourceTokens(relativePath) {
  return leaves(JSON.parse(await readFile(path.join(sourceDirectory, relativePath), 'utf8')));
}

function declarations(outputs, theme, defaultTheme = 'light') {
  const variables = new Map();
  for (const [file, css] of outputs) {
    if (!file.startsWith(theme + path.sep) || path.basename(file) === 'index.css') continue;
    const root = postcss.parse(css);
    assert.equal(root.nodes.length, 1, file);
    const explicit = `html[theme='${theme}']`;
    assert.equal(root.first.selector, theme === defaultTheme ? `html:not([theme]),\n${explicit}` : explicit, file);
    root.walkDecls(({ prop, value }) => {
      assert(!variables.has(prop), `${file}：重复变量 ${prop}`);
      variables.set(prop, value);
      if (file.endsWith(path.join('semantic', 'colors.css'))) {
        assert.match(value, /^(?:var\(--theme-[a-z0-9-]+\)|#[A-F0-9]{6}(?:[A-F0-9]{2})?)$/, file);
      }
    });
  }
  return variables;
}

function resolve(variables, name) {
  assert(variables.has(name), `缺少变量 ${name}`);
  const value = variables.get(name);
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (!reference) return value;
  assert(variables.has(reference[1]), `悬空引用 ${reference[1]}`);
  return variables.get(reference[1]);
}

function hex(value) {
  const alpha = value.alpha ?? 1;
  return (value.hex + (alpha === 1 ? '' : Math.round(alpha * 255).toString(16).padStart(2, '0'))).toUpperCase();
}

test('实际 source 的所有颜色、字体和圆角均转换正确，且不跨主题引用', async () => {
  const outputs = await buildThemeFiles();
  for (const [theme, sourceTheme] of [['light', 'light'], ['dark', 'dark ']]) {
    assert(!outputs.has(path.join(theme, 'primitive/radius.css')));
    const variables = declarations(outputs, theme);
    for (const token of await sourceTokens(`primitives/${sourceTheme}/ colors.tokens.json`)) {
      assert.equal(variables.get(`--theme-color-${token.name}`), hex(token.$value));
    }
    for (const token of await sourceTokens(`semantic/${sourceTheme}/colors.tokens.json`)) {
      if (token.$extensions['com.figma.composedColor']) {
        assert.equal(variables.get(`--color-${token.name}`), hex(token.$value));
        continue;
      }
      const target = token.$extensions['com.figma.aliasData'].targetVariableName.replace(new RegExp(`^${theme}/`, 'i'), '');
      assert.equal(variables.get(`--color-${token.name}`), `var(--theme-color-${target})`);
      assert.equal(resolve(variables, `--color-${token.name}`), variables.get(`--theme-color-${target}`));
    }
    for (const [mode, suffix] of [['English', 'en'], ['中文', 'zh'], ['Numeric', 'numeric']]) {
      for (const token of await sourceTokens(`semantic/${mode}.tokens.json`)) {
        const name = token.name === 'font-family-text' ? `font-family-${suffix}` : token.name;
        assert.equal(variables.get(`--${name}`), token.$type === 'string' ? JSON.stringify(token.$value) : `${token.$value}px`);
      }
    }
    for (const token of await sourceTokens('semantic/ radius.tokens.json')) {
      assert.equal(variables.get(`--radius-${token.name}`), `${token.$value}px`);
    }
  }
});

test('生成结果可重复，当前目录与 source 逐字节一致', async () => {
  assert.deepEqual(await buildThemeFiles(), await buildThemeFiles());
  await generateThemes({ check: true, quiet: true });
});

test('主题字体覆盖默认值，并保持另一主题不变', async t => {
  const options = await fixture(t);
  await writeJson(options.sourceDir, 'semantic/dark /English.tokens.json', {
    font: { family: { text: { $type: 'string', $value: 'Dark Font' } } },
    text: { base: { size: { $type: 'number', $value: 18, $extensions: { 'com.figma.scopes': ['FONT_SIZE'] } } } },
  });
  const outputs = await buildThemeFiles(options);
  const light = declarations(outputs, 'light');
  const dark = declarations(outputs, 'dark');
  assert.equal(light.get('--text-base-size'), '16px');
  assert.equal(light.get('--font-family-en'), '"Roboto"');
  assert.equal(dark.get('--text-base-size'), '18px');
  assert.equal(dark.get('--font-family-en'), '"Dark Font"');
});

test('check 检出修改、缺失、多余文件，且不执行写入', async t => {
  const options = await fixture(t);
  await generateThemes(options);
  const changed = path.join(options.targetDir, 'light/semantic/colors.css');
  const missing = path.join(options.targetDir, 'dark/semantic/typography.css');
  const extra = path.join(options.targetDir, 'obsolete.css');
  await writeFile(changed, 'modified');
  await rm(missing);
  const obsolete = '/* Generated by npm run tokens:build; do not edit. */';
  await writeFile(extra, obsolete);
  const entry = path.join(options.targetDir, 'light/custom.css');
  await writeFile(entry, '@import "./semantic/colors.css";');
  await assert.rejects(generateThemes({ ...options, check: true }), error => {
    assert.match(error.message, /内容不同：light\/semantic\/colors.css/);
    assert.match(error.message, /缺失：dark\/semantic\/typography.css/);
    assert.match(error.message, /多余文件：obsolete.css/);
    return true;
  });
  assert.equal(await readFile(changed, 'utf8'), 'modified');
  assert.equal(await readFile(extra, 'utf8'), obsolete);
  assert.equal(await readFile(entry, 'utf8'), '@import "./semantic/colors.css";');
  await assert.rejects(readFile(missing), { code: 'ENOENT' });
});

test('缺失 primitive 引用时在写文件之前报错', async t => {
  const options = await fixture(t);
  const file = path.join(options.sourceDir, 'semantic/light/colors.tokens.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  data.surface.page.$extensions['com.figma.aliasData'].targetVariableName = 'missing-50';
  await writeFile(file, JSON.stringify(data));
  await assert.rejects(generateThemes(options), /找不到 light 的 primitive/);
  await assert.rejects(readdir(options.targetDir), { code: 'ENOENT' });
});

test('变量规范化后的重名和字体模式冲突均报错', async t => {
  const options = await fixture(t);
  await writeJson(options.sourceDir, 'primitives/light/extra.tokens.json', {
    $type: 'color', 'a/b': { $value: '#FFFFFF' }, 'a-b': { $value: '#000000' },
  });
  await assert.rejects(buildThemeFiles(options), /重复的 CSS 变量/);
  await rm(path.join(options.sourceDir, 'primitives/light/extra.tokens.json'));
  const file = path.join(options.sourceDir, 'semantic/Numeric.tokens.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  data.text.base.size.$value = 17;
  await writeFile(file, JSON.stringify(data));
  await assert.rejects(buildThemeFiles(options), /字体模式的共用设置不一致/);
});

test('保留透明度、继承的类型；语义值以 primitive 引用为准', async t => {
  const options = await fixture(t);
  await writeJson(options.sourceDir, 'primitives/light/extra.tokens.json', {
    $type: 'color', transparent: { $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 0.5 } },
  });
  const file = path.join(options.sourceDir, 'semantic/light/colors.tokens.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  data.surface.page.$value = 'stale resolved value';
  await writeFile(file, JSON.stringify(data));
  const variables = declarations(await buildThemeFiles(options), 'light');
  assert.equal(variables.get('--theme-color-transparent'), '#FF000080');
  const target = data.surface.page.$extensions['com.figma.aliasData'].targetVariableName.replace(/^light\//i, '');
  assert.equal(variables.get('--color-surface-page'), `var(--theme-color-${target})`);
  assert.equal(resolve(variables, '--color-surface-page'), variables.get(`--theme-color-${target}`));
});

test('无效颜色、错误集合及错误文件类型不会被静默接受', async t => {
  const options = await fixture(t);
  const extra = 'primitives/light/extra.tokens.json';
  await writeJson(options.sourceDir, extra, { invalid: { $type: 'color', $value: { colorSpace: 'srgb', hex: '#FFFFFF', alpha: 2 } } });
  await assert.rejects(buildThemeFiles(options), /alpha/);
  await writeJson(options.sourceDir, extra, { invalid: { $type: 'number', $value: 12 } });
  await assert.rejects(buildThemeFiles(options), /颜色文件不支持 number/);
  await rm(path.join(options.sourceDir, extra));
  await writeJson(options.sourceDir, 'typo/light/colors.tokens.json', { invalid: { $type: 'color', $value: '#FFFFFF' } });
  await assert.rejects(buildThemeFiles(options), /文件路径应为/);
});

test('圆角非法值被拒绝，字体中的特殊字符按 CSS 规则转义', async t => {
  const options = await fixture(t);
  const radius = 'semantic/ radius.tokens.json';
  const original = await readFile(path.join(options.sourceDir, radius), 'utf8');
  await writeJson(options.sourceDir, radius, { scale: { bad: { $type: 'number', $value: -1 } } });
  await assert.rejects(buildThemeFiles(options), /圆角必须是非负数字/);
  await writeFile(path.join(options.sourceDir, radius), original);
  const file = path.join(options.sourceDir, 'semantic/English.tokens.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  data.font.family.text.$value = 'A\nB"C\\D';
  await writeFile(file, JSON.stringify(data));
  const variables = declarations(await buildThemeFiles(options), 'light');
  assert.equal(variables.get('--font-family-en'), String.raw`"A\a B\"C\\D"`);
});

test('主题入口和总入口自动导出所有生成的 token 文件', async () => {
  const outputs = await buildThemeFiles();
  const visited = new Set();
  function visit(file) {
    assert(outputs.has(file), `入口引用了不存在的文件：${file}`);
    assert(!visited.has(file), `重复导入：${file}`);
    visited.add(file);
    postcss.parse(outputs.get(file)).walkAtRules('import', rule => {
      const match = /^'([^']+)'$/.exec(rule.params);
      assert(match);
      visit(path.join(path.dirname(file), match[1]));
    });
  }
  visit('index.css');
  assert.equal(visited.size, outputs.size);
  assert.match(outputs.get(path.join('light', 'index.css')), /primitive\/colors.css/);
  assert.match(outputs.get(path.join('light', 'index.css')), /semantic\/radius.css/);
});

test('新增主题自动导出，配置的默认主题独占无 theme 属性时的回退', async t => {
  const options = await fixture(t);
  await cp(path.join(options.sourceDir, 'primitives/light'), path.join(options.sourceDir, 'primitives/custom'), { recursive: true });
  await cp(path.join(options.sourceDir, 'semantic/light'), path.join(options.sourceDir, 'semantic/custom'), { recursive: true });
  const customColors = path.join(options.sourceDir, 'semantic/custom/colors.tokens.json');
  await writeFile(customColors, (await readFile(customColors, 'utf8')).replaceAll('Light/', 'Custom/'));
  await writeJson(options.sourceDir, 'themes.config.json', { defaultTheme: 'custom' });
  const outputs = await buildThemeFiles(options);
  assert.match(outputs.get('index.css'), /@import '.\/custom\/index.css';/);
  const expected = declarations(outputs, 'light', 'custom');
  assert.deepEqual(declarations(outputs, 'custom', 'custom'), expected);
  declarations(outputs, 'dark', 'custom');
  const fallbackFiles = [...outputs].filter(([, css]) => css.includes('html:not([theme])'));
  assert.equal(fallbackFiles.length, 4);
  assert(fallbackFiles.every(([file]) => file.startsWith('custom' + path.sep)));
});

test('错误的默认主题配置在写入前报错，未配置时保留显式主题选择器', async t => {
  const options = await fixture(t);
  await writeJson(options.sourceDir, 'themes.config.json', { defaultTheme: 'missing' });
  await assert.rejects(generateThemes(options), /默认主题不存在：missing/);
  await assert.rejects(readdir(options.targetDir), { code: 'ENOENT' });
  await writeJson(options.sourceDir, 'themes.config.json', { defaultTheme: 1 });
  await assert.rejects(buildThemeFiles(options), /defaultTheme 必须是主题名称/);
  await rm(path.join(options.sourceDir, 'themes.config.json'));
  const outputs = await buildThemeFiles(options);
  declarations(outputs, 'light', null);
  declarations(outputs, 'dark', null);
  assert([...outputs.values()].every(css => !css.includes('html:not([theme])')));
});
