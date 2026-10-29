'use client';

import { Children, forwardRef } from 'react';
import type { ReactNode } from 'react';
import { BKIcon } from '../icon';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getEmptySizeStyle } from './size';
import type { EmptyProps } from './type';
import './index.css';

export type { EmptyProps } from './type';

/** 空白文本不占据插槽；数组中的 0 仍属于可见内容。 */
function hasContent(node: ReactNode) {
  return Children.toArray(node).some(child => typeof child !== 'string' || child.trim() !== '');
}

export const Empty = forwardRef<HTMLDivElement, EmptyProps>(function Empty(
  {
    className,
    description = '暂无数据',
    image,
    size = 'base',
    children,
    ...props
  },
  ref,
) {
  const isDefaultImage = image === undefined;
  const imageContent = isDefaultImage ? <BKIcon name="empty" size="100%" renderInServer /> : image;
  const hasImage = hasContent(imageContent);
  const hasDescription = hasContent(description);
  const hasActions = hasContent(children);
  const sizeStyle = getEmptySizeStyle(size);
  const rootProps = withoutStyle(props);

  // 尺寸标记由组件拥有，避免 JS 或 JSX 中手写的 data-size-* 激活未配置断点。
  for (const key of Object.keys(rootProps)) {
    if (key === 'data-size' || key.startsWith('data-size-')) {
      delete (rootProps as Record<string, unknown>)[key];
    }
  }

  return (
    <div
      {...rootProps}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      className={joinClassNames('bkreact-empty', className)}
      data-size={typeof size === 'string' ? size : 'responsive'}
      style={sizeStyle}
    >
      {hasImage && (
        <div className="bkreact-empty__image" aria-hidden={isDefaultImage || undefined}>
          {typeof imageContent === 'string' ? <img src={imageContent.trim()} alt="" /> : imageContent}
        </div>
      )}
      {hasDescription && <div className="bkreact-empty__description">{description}</div>}
      {hasActions && <div className="bkreact-empty__actions">{children}</div>}
    </div>
  );
});

export default Empty;
