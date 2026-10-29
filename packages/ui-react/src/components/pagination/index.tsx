'use client';

import { forwardRef } from 'react';
import { Button } from '../button';
import { BKIcon } from '../icon';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getPaginationPages, normalizePageCount } from './pages';
import { getPaginationSizeStyle } from './size';
import type { MouseEventHandler } from 'react';
import type { PaginationItemType, PaginationProps } from './type';
import './index.css';

export type {
  Pagingprops,
  PaginationProps,
  PaginationAs,
  PaginationItemType,
  PaginationItemProps,
} from './type';

function defaultItemAriaLabel(page: number, type: PaginationItemType) {
  if (type === 'previous') return '上一页';

  if (type === 'next') return '下一页';

  return `第 ${page} 页`;
}

export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    current,
    totalPage,
    className,
    pagerCount = 7,
    as = 'button',
    itemProps,
    getItemProps,
    onChange,
    size = 'base',
    disabled = false,
    label = '分页',
    getItemAriaLabel = defaultItemAriaLabel,
  },
  ref,
) {
  const total = normalizePageCount(totalPage);
  const page = Math.max(1, Math.min(normalizePageCount(current) || 1, total || 1));

  const renderItem = (target: number, type: PaginationItemType) => {
    const attributes = { ...itemProps?.[target], ...getItemProps?.(target, type) };
    const { onClick, disabled: itemDisabled, className: itemClassName, href, ...rest } = attributes;

    // 运行时也过滤由组件管理的属性，防止 JS 调用方绕过类型约束。
    for (const key of [
      'children',
      'dangerouslySetInnerHTML',
      'link',
      'type',
      'aria-current',
      'onChange',
      'size',
      'shape',
      'intent',
      'variant',
    ]) {
      Reflect.deleteProperty(rest, key);
    }

    const hasHref = typeof href === 'string' && href.trim().length > 0;
    const active = type === 'page' && target === page;
    const unavailable =
      disabled ||
      itemDisabled === true ||
      total === 0 ||
      (type === 'previous' && page === 1) ||
      (type === 'next' && page === total);

    const handleClick: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement> = event => {
      if (unavailable) {
        event.preventDefault();
        return;
      }

      onClick?.(event);

      if (event.defaultPrevented) return;

      if (as === 'a' && !hasHref) event.preventDefault();

      // 仅有效链接保留在新标签页打开等浏览器原生行为。
      if (
        as === 'a' &&
        hasHref &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        return;
      }

      if (target !== page) onChange?.(target);
    };

    const common = {
      ...rest,
      className: ['bk-pagination__item', itemClassName].filter(Boolean).join(' '),
      size,
      shape: 'square' as const,
      intent: active ? ('brand' as const) : ('normal' as const),
      variant: active ? ('fill' as const) : ('ghost' as const),
      disabled: unavailable,
      'aria-label': rest['aria-label'] ?? getItemAriaLabel(target, type),
      'aria-current': active ? ('page' as const) : undefined,
      'data-pagination-type': type,
      onClick: handleClick,
      prefixIcon:
        type === 'page' ? undefined : (
          <BKIcon name={type === 'previous' ? 'left' : 'right'} size="100%" renderInServer />
        ),
      children: type === 'page' ? target : undefined,
    };
    const key = type === 'page' ? target : type;

    return as === 'a' && hasHref ? (
      <Button key={key} {...common} link={href} />
    ) : (
      <Button key={key} {...common} />
    );
  };

  return (
    <nav
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      aria-label={label}
      className={['bk-pagination', className].filter(Boolean).join(' ')}
      style={getPaginationSizeStyle(size)}
    >
      <ul className="bk-pagination__list">
        <li>{renderItem(Math.max(1, page - 1), 'previous')}</li>
        {getPaginationPages(page, total, pagerCount).map(entry => (
          <li key={entry}>
            {typeof entry === 'number' ? (
              renderItem(entry, 'page')
            ) : (
              <span className="bk-pagination__ellipsis" aria-hidden="true">
                …
              </span>
            )}
          </li>
        ))}
        <li>{renderItem(Math.min(total || 1, page + 1), 'next')}</li>
      </ul>
    </nav>
  );
});

export default Pagination;
