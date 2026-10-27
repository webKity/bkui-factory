import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const fontModes = new Map([['English', 'en'], ['中文', 'zh'], ['Numeric', 'numeric']]);

export function normalizeName(value) {
  const name = value.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s/_.]+/g, '-').toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`无法转换变量或目录名称：${JSON.stringify(value)}`);
  }
  return name;
}

export async function findFiles(directory, suffix, allowMissing = false) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (allowMissing && error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(fullPath, suffix));
    else if (entry.isFile() && entry.name.trim().endsWith(suffix)) files.push(fullPath);
  }
  return files;
}

function parseSourcePath(relativePath) {
  const parts = relativePath.split(path.sep);
  const collection = parts[0].trim();
  if (!['primitives', 'semantic'].includes(collection) || ![2, 3].includes(parts.length)) {
    throw new Error('文件路径应为 primitives/<theme>/<name>.tokens.json 或 semantic/[<theme>/]<name>.tokens.json');
  }
  const sourceName = parts.at(-1).trim().slice(0, -'.tokens.json'.length);
  const isTypography = collection === 'semantic' && fontModes.has(sourceName);
  const isRadius = collection === 'semantic' && sourceName === 'radius';
  if (parts.length === 2 && !isTypography && !isRadius) throw new Error('只有字体模式和圆角文件可以不指定主题');
  return {
    relativePath,
    kind: isTypography ? 'typography' : isRadius ? 'radius' : collection === 'primitives' ? 'primitive' : 'semantic',
    theme: parts.length === 3 ? normalizeName(parts[1]) : null,
    name: isTypography ? fontModes.get(sourceName) : normalizeName(sourceName),
  };
}

export function collectTokens(group, names = [], inheritedType, tokens = []) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    throw new Error(`无效的变量分组：${names.join('.')}`);
  }
  const type = group.$type ?? inheritedType;
  if (Object.hasOwn(group, '$value')) {
    if (!names.length) throw new Error('变量必须有名称');
    tokens.push({
      name: names.map(normalizeName).join('-'),
      type,
      value: group.$value,
      scopes: group.$extensions?.['com.figma.scopes'] ?? [],
      alias: group.$extensions?.['com.figma.aliasData'],
    });
  } else {
    for (const [name, child] of Object.entries(group)) {
      if (!name.startsWith('$')) collectTokens(child, [...names, name], type, tokens);
    }
  }
  return tokens;
}

export function colorToCss(value) {
  if (typeof value === 'string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(value)) return value.toUpperCase();
  if (!value || typeof value !== 'object' || value.colorSpace !== 'srgb') {
    throw new Error('颜色必须是十六进制颜色或 Figma srgb 颜色对象');
  }
  const alpha = value.alpha ?? 1;
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new Error('颜色 alpha 必须介于 0 和 1 之间');
  let hex = value.hex;
  if (hex !== undefined && !/^#[\da-f]{6}$/i.test(hex)) throw new Error(`无效的颜色 hex：${hex}`);
  if (hex === undefined) {
    if (!Array.isArray(value.components) || value.components.length !== 3 ||
        value.components.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 1)) {
      throw new Error('srgb components 必须包含三个介于 0 和 1 之间的数字');
    }
    hex = `#${value.components.map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
  }
  return `${hex}${alpha === 1 ? '' : Math.round(alpha * 255).toString(16).padStart(2, '0')}`.toUpperCase();
}

export async function readSources(sourceDir) {
  const files = await findFiles(sourceDir, '.tokens.json');
  if (!files.length) throw new Error('source 中没有找到 .tokens.json 文件');
  const sources = [];
  for (const file of files) {
    if (path.relative(sourceDir, file).split(path.sep)[0] === 'components') continue;
    const relativePath = path.relative(sourceDir, file);
    try {
      const source = parseSourcePath(relativePath);
      source.tokens = collectTokens(JSON.parse(await readFile(file, 'utf8')));
      if (!source.tokens.length) throw new Error('文件中没有变量');
      const names = new Set();
      for (const token of source.tokens) {
        if (names.has(token.name)) throw new Error(`重复的 CSS 变量：${token.name}`);
        names.add(token.name);
        if (['primitive', 'semantic'].includes(source.kind) && token.type !== 'color') {
          throw new Error(`颜色文件不支持 ${token.type} 变量：${token.name}`);
        }
      }
      sources.push(source);
    } catch (error) {
      throw new Error(`${relativePath}：${error.message}`);
    }
  }
  return sources;
}

export async function readDefaultTheme(sourceDir) {
  const file = path.join(sourceDir, 'themes.config.json');
  const text = await readFile(file, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '{}';
    throw error;
  });
  try {
    const config = JSON.parse(text);
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('配置必须是对象');
    if (config.defaultTheme !== undefined && typeof config.defaultTheme !== 'string') {
      throw new Error('defaultTheme 必须是主题名称');
    }
    return config.defaultTheme;
  } catch (error) {
    throw new Error(`themes.config.json：${error.message}`);
  }
}


export function quoteCssString(value) {
  return `"${value.replace(/["\\\n\r\f]/g, char => ({
    '"': '\\"', '\\': '\\\\', '\n': '\\a ', '\r': '\\d ', '\f': '\\c ',
  })[char])}"`;
}

// This intermediate model contains typed values and references, never CSS syntax.
export async function buildTokenModel({ sourceDir, components: includeComponents = true }) {
  const sources = await readSources(sourceDir);
  const themes = [...new Set(sources.map(source => source.theme).filter(Boolean))].sort();
  if (!themes.length) throw new Error('没有主题');
  const configuredDefaultTheme = await readDefaultTheme(sourceDir);
  const defaultTheme = configuredDefaultTheme ?? themes[0];
  if (!themes.includes(defaultTheme)) throw new Error(`默认主题不存在：${defaultTheme}`);
  const components = Object.create(null);
  const componentDir = path.join(sourceDir, 'components');
  const files = await readdir(componentDir).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const file of includeComponents ? files.sort() : []) {
    if (!file.endsWith('.tokens.json')) continue;
    const name = normalizeName(file.slice(0, -'.tokens.json'.length));
    if (Object.hasOwn(components, name)) throw new Error(`重复组件：${name}`);
    components[name] = JSON.parse(await readFile(path.join(componentDir, file), 'utf8'));
  }
  const result = { sources, configuredDefaultTheme, defaultTheme, themes: {}, componentDefinitions: components };
  for (const theme of themes) {
    const tokens = new Map();
    const add = (id, token) => {
      if (tokens.has(id)) throw new Error(`重复 token：${theme}/${id}`);
      tokens.set(id, token);
    };
    for (const source of sources.filter(source => source.theme === theme && source.kind === 'primitive')) {
      for (const token of source.tokens) add(`primitive.${token.name}`, { type: 'color', value: colorToCss(token.value) });
    }
    for (const source of sources.filter(source => source.theme === theme && source.kind === 'semantic')) {
      for (const token of source.tokens) {
        if (!/^Primitives?(?:\s*\/|$)/i.test(token.alias?.targetVariableSetName ?? '') || !token.alias?.targetVariableName) {
          throw new Error(`缺少 primitive 引用：${token.name}`);
        }
        add(`semantic.color-${token.name}`, { type: 'color', ref: `primitive.${normalizeName(token.alias.targetVariableName)}` });
      }
    }
    const typography = new Map();
    const fontNames = { en: 'en', zh: 'zh', numeric: 'numeric' };
    for (const scope of [null, theme]) {
      const scoped = new Map();
      for (const source of sources.filter(source => source.kind === 'typography' && source.theme === scope)) {
        for (const token of source.tokens) {
          const name = token.name === 'font-family-text' ? `font-family-${fontNames[source.name]}` : token.name;
          const type = token.scopes.some(scope => ['FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING'].includes(scope)) ? 'dimension' : token.type;
          if (!['number', 'string'].includes(token.type) || (token.type === 'number' ? !Number.isFinite(token.value) : typeof token.value !== 'string')) throw new Error(`变量类型或值无效：${token.name}`);
          const entry = { type, value: token.value };
          if (scoped.has(name) && JSON.stringify(scoped.get(name)) !== JSON.stringify(entry)) throw new Error(`字体模式的共用设置不一致：${name}`);
          scoped.set(name, entry);
        }
      }
      for (const [name, token] of scoped) typography.set(name, token);
    }
    for (const [name, token] of typography) add(`semantic.${name}`, token);
    for (const scope of [null, theme]) {
      if (sources.filter(source => source.kind === 'radius' && source.theme === scope).length > 1) throw new Error('重复的圆角文件');
    }
    const radius = sources.find(source => source.kind === 'radius' && source.theme === theme)
      ?? sources.find(source => source.kind === 'radius' && source.theme === null);
    for (const token of radius?.tokens ?? []) {
      if (token.type !== 'number' || !Number.isFinite(token.value) || token.value < 0) throw new Error('圆角必须是非负数字');
      add(`semantic.radius-${token.name}`, { type: 'dimension', value: token.value });
    }

    function visit(group, parts, inheritedType) {
      if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error(`无效组件 token：${parts.join('.')}`);
      const type = group.$type ?? inheritedType;
      if (Object.hasOwn(group, '$value')) {
        const raw = group.$value;
        const alias = typeof raw === 'string' && /^\{([^{}]+)\}$/.exec(raw);
        let value = raw;
        if (!alias && type === 'dimension') {
          if (!raw || typeof raw !== 'object' || raw.unit !== 'px' || !Number.isFinite(raw.value)) throw new Error(`dimension 必须为有限 px 数值：${parts.join('.')}`);
          value = raw.value;
        }
        if (!alias && type === 'color') value = colorToCss(raw);
        if (!['color', 'dimension', 'number', 'string'].includes(type)) throw new Error(`不支持的 token 类型：${parts.join('.')} (${type})`);
        if (!alias && (['dimension', 'number'].includes(type) ? !Number.isFinite(value) : typeof value !== 'string')) throw new Error(`无效 token 值：${parts.join('.')}`);
        add(parts.join('.'), { type, ...(alias ? { ref: alias[1] } : { value }) });
        return;
      }
      for (const [name, child] of Object.entries(group)) {
        if (!name.startsWith('$')) visit(child, [...parts, normalizeName(name)], type);
      }
    }
    for (const [name, group] of Object.entries(components)) visit(group, ['components', name]);
    const resolved = new Map();
    function resolve(id, stack = []) {
      if (resolved.has(id)) return resolved.get(id);
      if (stack.includes(id)) throw new Error(`循环引用：${[...stack, id].join(' → ')}`);
      const token = tokens.get(id);
      if (!token && id.startsWith('primitive.')) throw new Error(`找不到 ${theme} 的 primitive：${id}`);
      if (!token) throw new Error(`找不到 token：${theme}/${id}`);
      let value = token.value;
      if (token.ref) {
        value = resolve(token.ref, [...stack, id]);
        if (tokens.get(token.ref).type !== token.type) throw new Error(`引用类型不匹配：${id} → ${token.ref}`);
      }
      resolved.set(id, value);
      return value;
    }
    for (const id of tokens.keys()) resolve(id);
    if (includeComponents) {
      const sizeProperties = {
        button: ['height', 'padding-x', 'padding-y', 'font-size', 'line-height', 'gap', 'icon-size', 'fixed-width'],
        loading: [],
        'input-otp': ['slot-size', 'font-size', 'line-height', 'gap'],
      };
      for (const [component, properties] of Object.entries(sizeProperties)) {
        const file = path.join(sourceDir, 'components', `${component}.tokens.json`);
        if (!Object.hasOwn(components, component)) throw new Error(`${file}：缺少组件设计定义`);
        for (const size of ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
          for (const property of properties.length ? properties : [null]) {
            const id = `components.${component}.sizes.${size}${property ? `.${property}` : ''}`;
            const token = tokens.get(id);
            if (!token) throw new Error(`${file}：缺少尺寸 token ${id}`);
            if (token.type !== 'dimension') throw new Error(`${file}：尺寸 token 必须为 dimension：${id}`);
            const value = resolve(id);
            if (!Number.isFinite(value) || value < 0) throw new Error(`${file}：尺寸 token 必须为非负有限数值：${id}`);
          }
        }
      }
      const buttonFile = path.join(sourceDir, 'components/button.tokens.json');
      const requiredButtonTokens = new Map([
        ['base.shape-square-padding', 'dimension'], ['base.content-gap', 'dimension'],
        ['base.spinner-border-width', 'dimension'],
        ['base.spinner-duration-ms', 'number'], ['base.loading-duration-ms', 'number'],
        ['base.outline-hover-bg', 'color'], ['base.outline-active-bg', 'color'],
      ]);
      for (const intent of ['brand', 'success', 'danger', 'warning', 'normal']) {
        for (const property of ['tone-color', 'tone-bg', 'tone-border-color', 'tone-hover-bg', 'tone-active-bg', 'tone-outline-color']) {
          requiredButtonTokens.set(`intents.${intent}.${property}`, 'color');
        }
      }
      for (const [name, type] of requiredButtonTokens) {
        const id = `components.button.${name}`;
        const token = tokens.get(id);
        if (!token) throw new Error(`${buttonFile}：缺少组件 token ${id}`);
        if (token.type !== type) throw new Error(`${buttonFile}：${id} 必须为 ${type}`);
        const value = resolve(id);
        if ((type === 'dimension' && value < 0) || (type === 'number' && value <= 0)) {
          throw new Error(`${buttonFile}：${id} 必须为${type === 'dimension' ? '非负数' : '正数'}`);
        }
      }
    }

    const native = { primitive: {}, semantic: {}, components: {} };
    for (const [id, value] of resolved) {
      const parts = id.split('.');
      let target = native;
      for (const part of parts.slice(0, -1)) {
        if (!Object.hasOwn(target, part)) target[part] = {};
        target = target[part];
      }
      target[parts.at(-1)] = value;
    }
    result.themes[theme] = { tokens, resolved, native };
  }
  return result;
}
