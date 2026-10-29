export const MAX_PAGER_COUNT = 21;

export type PaginationEntry = number | 'ellipsis-start' | 'ellipsis-end';

export function normalizePageCount(value: number): number {
  return Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : 0;
}

/** 仅生成可见区间，不按总页数创建数组。 */
export function getPaginationPages(
  current: number,
  total: number,
  pagerCount = 7,
): PaginationEntry[] {
  total = normalizePageCount(total);

  if (total === 0) return [];

  current = Math.min(total, Math.max(1, normalizePageCount(current) || 1));

  let count = Number.isFinite(pagerCount) ? Math.max(5, Math.floor(pagerCount)) : 7;

  if (count % 2 === 0) count += 1;

  // total 较小时 count 可以为偶数，此时直接返回全部页码。
  count = Math.min(count, total, MAX_PAGER_COUNT);

  if (total <= count) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const innerCount = count - 2;
  const start = Math.max(2, Math.min(current - Math.floor(innerCount / 2), total - innerCount));
  const end = start + innerCount - 1;
  const pages: PaginationEntry[] = [1];

  if (start === 3) pages.push(2);
  else if (start > 3) pages.push('ellipsis-start');

  for (let page = start; page <= end; page += 1) pages.push(page);

  if (end === total - 2) pages.push(total - 1);
  else if (end < total - 2) pages.push('ellipsis-end');

  pages.push(total);

  return pages;
}
