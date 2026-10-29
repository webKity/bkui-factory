import type { ComponentPropsWithoutRef, DOMAttributes, Key, ReactNode } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export type BreadcrumbItem = Omit<ComponentPropsWithoutRef<'a'>, keyof DOMAttributes<HTMLElement> | 'style' | 'aria-current' | 'aria-disabled' | 'href'> & Omit<DOMAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML'> & {
  [attribute: `data-${string}`]: unknown;
  key?: Key;
  label: ReactNode;
  /** null / undefined 均呈现为静态祖先；空字符串保留原生链接语义。 */
  href?: string | null;
  /** 装饰图标；可访问名称由 label 提供。 */
  icon?: ReactNode;
  /** 禁用项移除链接及事件处理，退出 Tab 顺序；当前页忽略 disabled。 */
  disabled?: boolean;
};

export type BreadcrumbProps = Omit<ComponentPropsWithoutRef<'nav'>, 'children' | 'style' | 'aria-label'> & {
  /** 默认 Breadcrumb；本地化时传入 aria-label 或 aria-labelledby，null 显式移除名称。 */
  'aria-label'?: string | null;
  /** 按层级排列，最后一项始终作为当前页，移除链接及事件；空数组不渲染。 */
  items: readonly BreadcrumbItem[];
  /** 默认 /；null、布尔值、空字符串均不生成分隔符。 */
  separator?: ReactNode;
  /** 内联 scope 变量由 size 控制；外部 CSS 可覆盖 --breadcrumb-font-size / gap 等最终 tokens。 */
  size?: IBKSize | IBKResponsiveSize;
};
