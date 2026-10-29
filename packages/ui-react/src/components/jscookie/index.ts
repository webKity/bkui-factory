/* -------------------------------------------------------------------------- *
 * cookie.ts
 *
 * 基于 js-cookie 3.0.7 源码转写的 TypeScript 版本
 * 无外部依赖，可直接放入项目使用
 *
 * 注意：需要 tsconfig 的 lib 中包含 "DOM"，否则 document 会报错。
 * -------------------------------------------------------------------------- */

/* ------------------------------- 类型定义 ------------------------------- */

export interface CookieAttributes {
  /** 过期时间：数字表示天数，或直接传入 Date */
  expires?: number | Date | string;
  /** 生效路径，默认 '/' */
  path?: string;
  /** 生效域名 */
  domain?: string;
  /** 仅通过 HTTPS 传输 */
  secure?: boolean;
  /** 跨站请求策略 */
  sameSite?: 'strict' | 'lax' | 'none' | 'Strict' | 'Lax' | 'None';
  /** 允许额外的自定义属性 */
  [key: string]: string | number | boolean | Date | undefined;
}

export interface CookieConverter {
  read: (value: string, name: string) => string;
  write: (value: string, name: string) => string;
}

export interface CookiesStatic {
  readonly attributes: Readonly<CookieAttributes>;
  readonly converter: Readonly<CookieConverter>;

  /** 写入 Cookie，返回最终写入的 document.cookie 字符串（SSR 下返回 undefined） */
  set(name: string, value: string, attributes?: CookieAttributes): string | undefined;

  /** 读取全部 Cookie */
  get(): Record<string, string>;
  /** 读取单个 Cookie */
  get(name: string): string | undefined;

  /** 删除 Cookie，必须传入与写入时一致的 path / domain / secure / sameSite */
  remove(name: string, attributes?: CookieAttributes): void;

  /** 派生一个带默认属性的新实例 */
  withAttributes(attributes: CookieAttributes): CookiesStatic;
  /** 派生一个带自定义转换器的新实例 */
  withConverter(converter: Partial<CookieConverter>): CookiesStatic;
}

/* ------------------------------- 内部工具 ------------------------------- */

/**
 * 合并多个属性对象，返回全新对象。
 * 显式跳过 __proto__ / constructor / prototype，避免原型污染。
 * 使用 Object.keys 而非 for...in，天然不遍历原型链。
 */
function extend(...sources: Array<CookieAttributes | undefined>): CookieAttributes {
  const result: CookieAttributes = {};

  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      result[key] = source[key];
    }
  }

  return result;
}

/** 等价于 escape('(') / escape(')')，避免使用已废弃的全局 escape */
function escapeParentheses(char: string): string {
  return '%' + char.charCodeAt(0).toString(16).toUpperCase();
}

/* ------------------------------- 核心实现 ------------------------------- */

function init(converter: CookieConverter, defaultAttributes: CookieAttributes): CookiesStatic {
  function set(name: string, value: string, attributes?: CookieAttributes): string | undefined {
    // SSR 环境直接跳过
    if (typeof document === 'undefined') return;

    const attrs = extend(defaultAttributes, attributes);

    // 数字 -> 天数 -> Date
    if (typeof attrs.expires === 'number') {
      attrs.expires = new Date(Date.now() + attrs.expires * 864e5);
    }

    // Date -> UTC 字符串
    if (attrs.expires instanceof Date) {
      attrs.expires = attrs.expires.toUTCString();
    }

    // Cookie 名称编码：保留部分可读字符，与原版行为一致
    const encodedName = encodeURIComponent(name)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, escapeParentheses);

    let stringifiedAttributes = '';

    for (const attributeName of Object.keys(attrs)) {
      const attributeValue = attrs[attributeName];

      if (!attributeValue) continue;

      stringifiedAttributes += '; ' + attributeName;

      if (attributeValue === true) continue;

      // split('; ')[0] 截断分号后的内容，防止属性注入
      stringifiedAttributes += '=' + String(attributeValue).split('; ')[0];
    }

    return (document.cookie =
      encodedName + '=' + converter.write(value, name) + stringifiedAttributes);
  }

  function get(): Record<string, string>;
  function get(name: string): string | undefined;
  function get(name?: string): Record<string, string> | string | undefined {
    if (typeof document === 'undefined') return;

    // 显式传入空字符串时返回 undefined，与原版 arguments.length 判断等价
    if (name !== undefined && !name) return;

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const jar: Record<string, string> = {};

    for (const cookie of cookies) {
      const parts = cookie.split('=');
      let value = parts.slice(1).join('=');

      if (value[0] === '"') value = value.slice(1, -1);

      try {
        const found = decodeURIComponent(parts[0]);
        jar[found] = converter.read(value, found);

        if (name === found) break;
      } catch {
        // 单个 Cookie 解码失败，跳过即可，不影响其余条目
      }
    }

    return name ? jar[name] : jar;
  }

  function remove(name: string, attributes?: CookieAttributes): void {
    set(name, '', extend(attributes, { expires: -1 }));
  }

  function withAttributes(attributes: CookieAttributes): CookiesStatic {
    return init(converter, extend(defaultAttributes, attributes));
  }

  function withConverter(newConverter: Partial<CookieConverter>): CookiesStatic {
    return init({ ...converter, ...newConverter }, defaultAttributes);
  }

  return {
    set,
    get,
    remove,
    withAttributes,
    withConverter,
    // 冻结默认属性与转换器，避免外部意外修改
    attributes: Object.freeze({ ...defaultAttributes }),
    converter: Object.freeze({ ...converter }),
  };
}

/* ------------------------------ 默认转换器 ------------------------------ */

const defaultConverter: CookieConverter = {
  read(value: string): string {
    if (value[0] === '"') value = value.slice(1, -1);
    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
  },
  write(value: string): string {
    return encodeURIComponent(value).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent,
    );
  },
};

/* ------------------------------ 默认实例 ------------------------------ */

const Cookies: CookiesStatic = init(defaultConverter, { path: '/' });

export default Cookies;

export { Cookies, init, defaultConverter };
