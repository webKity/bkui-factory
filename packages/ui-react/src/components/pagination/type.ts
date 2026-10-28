import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';
import type { ButtonProps } from '../button/type';

export type PaginationAs = 'button' | 'a';
export type PaginationItemType = 'page' | 'previous' | 'next';
export type PaginationItemProps = HTMLAttributes<HTMLElement>
  & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download' | 'hrefLang' | 'referrerPolicy'>
  & { disabled?: boolean }
  & Record<string, unknown>;

export interface Pagingprops extends Pick<ButtonProps, 'size' | 'disabled'> {
  /** 受控当前页，从 1 开始。 */
  current: number;
  /** 总页数；为 0 时仅显示禁用的上一页、下一页。 */
  totalPage: number;
  className?: string;
  /** 页码窗口大小，默认 7；最小 5，偶数向上取奇数，省略号另计，相隔一页时补齐。 */
  pagerCount?: number;
  as?: PaginationAs;
  /** 按目标页码设置属性，同时作用于指向该页的上一页 / 下一页。 */
  itemProps?: Record<number, PaginationItemProps>;
  /** 动态属性覆盖 itemProps；onClick 调用 preventDefault 可取消切页。 */
  getItemProps?: (page: number, type: PaginationItemType) => PaginationItemProps | undefined;
  onChange?: (page: number) => void;
}
export type PaginationProps = Pagingprops;
