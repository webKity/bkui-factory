// 编译为独立 CSS，调用方无需注册 Typography 插件。
const typography = require('@tailwindcss/typography');

const css = {
  color: 'var(--tw-prose-body)',
  maxWidth: 'var(--typography-max-width)',
  fontFamily: 'var(--typography-font-family)',
  fontSize: 'var(--typography-font-size)',
  lineHeight: 'var(--typography-line-height)',
};

// 直接读取容器当前 size 的字号，嵌套内容也不会被父元素字号影响。
css['[class~="lead"]'] = {
  fontSize: 'var(--typography-lead-font-size)',
  lineHeight: 'var(--typography-lead-line-height)',
};

// 将插件的颜色接口映射到组件自身 tokens，主题切换沿用项目语义颜色。
for (const name of [
  'body',
  'headings',
  'lead',
  'links',
  'bold',
  'counters',
  'bullets',
  'hr',
  'quotes',
  'quote-borders',
  'captions',
  'kbd',
  'kbd-shadows',
  'code',
  'pre-code',
  'pre-bg',
  'th-borders',
  'td-borders',
]) {
  css[`--tw-prose-${name}`] = `var(--typography-${name})`;
  css[`--tw-prose-invert-${name}`] = `var(--typography-${name})`;
}

for (let level = 1; level <= 6; level++) {
  css[`h${level}`] = {
    color: 'var(--typography-headings)',
    fontSize: `var(--typography-h${level}-font-size)`,
    lineHeight: `var(--typography-h${level}-line-height)`,
    fontWeight: 'var(--typography-heading-font-weight)',
    marginTop: 'var(--typography-heading-margin-top)',
    marginBottom: 'var(--typography-heading-margin-bottom)',
  };
}

css.pre = {
  borderRadius: 'var(--typography-code-radius)',
  whiteSpace: 'pre',
  backgroundColor: 'var(--typography-pre-bg)',
  color: 'var(--typography-pre-code)',
  fontFamily: 'var(--typography-code-font-family)',
};

// 插件通常配合 Tailwind Preflight 使用；在组件作用域内补齐必要规则。
css.code = { fontFamily: 'var(--typography-code-font-family)' };

css.kbd = { fontFamily: 'var(--typography-kbd-font-family)' };

css.blockquote = { borderInlineStartStyle: 'var(--typography-border-style)', marginInline: '0' };

css.hr = {
  borderStyle: 'var(--typography-border-style)',
  borderTopWidth: 'var(--typography-rule-width)',
  borderInlineWidth: '0',
  borderBottomWidth: '0',
};

css.table = { borderCollapse: 'collapse', borderSpacing: '0' };

css['thead, tbody tr'] = { borderBottomStyle: 'var(--typography-border-style)' };

css.tfoot = { borderTopStyle: 'var(--typography-border-style)' };

css['img, video'] = { display: 'block', maxWidth: '100%', height: 'auto' };

css.figure = { marginInline: '0' };

css.a = {
  fontWeight: 'var(--typography-link-font-weight)',
  textDecoration: 'var(--typography-link-decoration)',
};

css['a:hover'] = { color: 'var(--typography-link-hover-color)' };

css.strong = { fontWeight: 'var(--typography-strong-font-weight)' };

module.exports = {
  plugins: [typography({ className: 'bk-typography' })],
  theme: { extend: { typography: { DEFAULT: { css } } } },
};
