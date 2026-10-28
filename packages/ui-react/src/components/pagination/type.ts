import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';
import type { ButtonProps } from '../button/type';

export type PaginationAs = 'button' | 'a';
export type PaginationItemType = 'page' | 'previous' | 'next';
export type PaginationItemProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'aria-current'
> & Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'target' | 'rel' | 'download' | 'hrefLang' | 'referrerPolicy'
> & {
  disabled?: boolean;
  [key: `data-${string}`]: unknown;
};

export interface PaginationProps extends Pick<ButtonProps, 'size' | 'disabled'> {
  /** 受控当前页，从 1 开始。 */
  current: number;
  /** 总页数；为 0 时仅显示禁用的上一页、下一页。 */
  totalPage: number;
  className?: string;
  /**
   * 页码窗口大小，默认 7；最小 5、最大 21，偶数向上取奇数。
   * 省略号另计，相隔一页时补齐。
   */
  pagerCount?: number;
  /** 有效链接点击时先调用 onChange，再由浏览器导航；无有效 href 时回退为按钮。 */
  as?: PaginationAs;
  /** 导航区域的可访问名称；多个分页区域应使用不同名称。 */
  label?: string;
  /** 自定义逐项名称；itemProps 中的 aria-label 优先。 */
  getItemAriaLabel?: (page: number, type: PaginationItemType) => string;
  /**
   * 按目标页码设置原生属性，同时作用于指向该页的上一页 / 下一页。
   * 内容、size、shape、intent、variant 和当前页语义由 Pagination 管理。
   */
  itemProps?: Record<number, PaginationItemProps>;
  /** 动态属性覆盖 itemProps；onClick 调用 preventDefault 可取消切页。 */
  getItemProps?: (
    page: number,
    type: PaginationItemType,
  ) => PaginationItemProps | undefined;
  onChange?: (page: number) => void;
}
/** @deprecated 使用 PaginationProps。 */
export type Pagingprops = PaginationProps;
