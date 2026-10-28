'use client';

import { forwardRef } from 'react';
import { Button } from '../button';
import { getPaginationPages, normalizePageCount } from './pages';
import type { MouseEventHandler } from 'react';
import type { PaginationItemType, PaginationProps } from './type';
import './index.css';

export type { Pagingprops, PaginationProps, PaginationAs, PaginationItemType, PaginationItemProps } from './type';

export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination({
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
}, ref) {
  const total = normalizePageCount(totalPage);
  const page = Math.max(1, Math.min(normalizePageCount(current) || 1, total || 1));

  const renderItem = (target: number, type: PaginationItemType) => {
    const attributes = { ...itemProps?.[target], ...getItemProps?.(target, type) };
    const {
      onClick, disabled: itemDisabled, className: itemClassName, href,
      // 内容、元素类型和当前页语义由 Pagination 管理。
      children: _children, dangerouslySetInnerHTML: _html, link: _link, type: _type, 'aria-current': _ariaCurrent,
      ...rest
    } = attributes;
    const active = type === 'page' && target === page;
    const unavailable = disabled || itemDisabled === true || total === 0
      || (type === 'previous' && page === 1) || (type === 'next' && page === total);
    const handleClick: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement> = event => {
      if (unavailable) { event.preventDefault(); return; }
      onClick?.(event);
      if (event.defaultPrevented) return;
      // 保留链接在新标签页打开等浏览器原生行为。
      if (as === 'a' && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      if (as === 'a' && typeof href !== 'string') event.preventDefault();
      if (target !== page) onChange?.(target);
    };
    const common = {
      ...rest,
      className: ['bk-pagination__item', typeof itemClassName === 'string' ? itemClassName : ''].filter(Boolean).join(' '),
      size,
      shape: 'square' as const,
      intent: active ? 'brand' as const : 'normal' as const,
      variant: active ? 'fill' as const : 'ghost' as const,
      disabled: unavailable,
      'aria-label': typeof rest['aria-label'] === 'string' ? rest['aria-label'] : type === 'previous' ? '上一页' : type === 'next' ? '下一页' : `第 ${target} 页`,
      'aria-current': active ? 'page' as const : undefined,
      'data-pagination-type': type,
      onClick: handleClick,
      children: type === 'page' ? target : <span aria-hidden="true">{type === 'previous' ? '‹' : '›'}</span>,
    };
    return as === 'a'
      ? <Button key={type === 'page' ? target : type} {...common} link={typeof href === 'string' ? href : ''} />
      : <Button key={type === 'page' ? target : type} {...common} />;
  };

  return (
    <nav ref={ref} aria-label="分页" className={['bk-pagination', className].filter(Boolean).join(' ')}>
      <ul className="bk-pagination__list">
        <li>{renderItem(Math.max(1, page - 1), 'previous')}</li>
        {getPaginationPages(page, total, pagerCount).map(entry => (
          <li key={entry}>{typeof entry === 'number' ? renderItem(entry, 'page')
            : <span className="bk-pagination__ellipsis" aria-hidden="true">…</span>}</li>
        ))}
        <li>{renderItem(Math.min(total || 1, page + 1), 'next')}</li>
      </ul>
    </nav>
  );
});

export default Pagination;
