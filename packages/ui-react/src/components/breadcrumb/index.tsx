'use client';

import { forwardRef } from 'react';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getBreadcrumbSizeStyle } from './size';
import type { BreadcrumbProps } from './type';
import './index.css';

export type { BreadcrumbProps, BreadcrumbItem } from './type';

// span 保留通用 HTML、ARIA 和 data-* 属性，移除仅适用于链接的属性。
const anchorOnlyAttributes = new Set(['href', 'target', 'rel', 'download', 'ping', 'hrefLang', 'media', 'type', 'referrerPolicy']);
function getStaticItemProps(props: object, inactive: boolean) {
  return Object.fromEntries(Object.entries(withoutStyle(props)).filter(([name]) => (
    !anchorOnlyAttributes.has(name)
    && name !== 'aria-disabled' && name !== 'aria-current' && name !== 'dangerouslySetInnerHTML'
    && (!inactive || (!/^on[A-Z]/.test(name) && name !== 'tabIndex' && name !== 'autoFocus'))
  )));
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, separator = '/', size = 'base', className, 'aria-label': ariaLabel, ...props },
  ref,
) {
  if (items.length === 0) return null;
  const hasSeparator = separator != null && typeof separator !== 'boolean' && separator !== '';
  const accessibleLabel = ariaLabel !== undefined ? ariaLabel : (props['aria-labelledby'] ? undefined : 'Breadcrumb');
  return (
    <nav
      {...withoutStyle(props)}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      aria-label={accessibleLabel ?? undefined}
      className={joinClassNames('bkreact-breadcrumb', className)}
      data-size={typeof size === 'string' ? size : 'responsive'}
      style={getBreadcrumbSizeStyle(size)}
    >
      <ol className="bkreact-breadcrumb__list" role="list">
        {items.map(({ key, label, icon, disabled = false, className: itemClassName, ...linkProps }, index) => {
          const current = index === items.length - 1;
          const isDisabled = disabled && !current;
          const content = <>
            {icon != null && <span className="bkreact-breadcrumb__icon" aria-hidden="true">{icon}</span>}
            <span className="bkreact-breadcrumb__label">{label}</span>
          </>;

          return (
            <li key={key ?? index} className="bkreact-breadcrumb__item">
              {index > 0 && hasSeparator && (
                <span className="bkreact-breadcrumb__separator" aria-hidden="true">{separator}</span>
              )}
              {!current && !isDisabled && linkProps.href != null ? (
                <a
                  {...withoutStyle(linkProps)}
                  href={linkProps.href}
                  aria-disabled={undefined}
                  aria-current={undefined}
                  className={joinClassNames('bkreact-breadcrumb__link', itemClassName)}
                >
                  {content}
                </a>
              ) : (
                <span
                  {...getStaticItemProps(linkProps, current || isDisabled)}
                  className={joinClassNames('bkreact-breadcrumb__text', itemClassName)}
                  aria-current={current ? 'page' : undefined}
                  aria-disabled={isDisabled || undefined}
                  data-disabled={isDisabled || undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

export default Breadcrumb;
