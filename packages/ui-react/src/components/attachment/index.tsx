'use client';

import { forwardRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getAttachmentSizeStyle } from './size';
import type { IAttachmentProps } from './type';
import './index.css';

export type * from './type';

const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : undefined;

function firstCharacter(value: string) {
  return segmenter ? segmenter.segment(value)[Symbol.iterator]().next().value?.segment : [...value][0];
}

// 主图或备用图地址变化都重置失败状态，重新尝试主图。
// JSON 元组 key 可区分包含任意分隔符的地址。
function DefaultImage({ img, imgFallback, className, alt, loading }: {
  img?: string; imgFallback?: string; className?: string; alt: string;
  loading: IAttachmentProps['loading'];
}) {
  const [failed, setFailed] = useState(false);
  return (
    <AvatarImage
      keepMounted={loading === 'lazy'}
      loading={loading}
      src={failed ? imgFallback : img || imgFallback}
      alt={alt}
      className={className}
      onLoadingStatusChange={status => {
        if (status === 'error' && img && imgFallback && img !== imgFallback && !failed) setFailed(true);
      }}
    />
  );
}

export const Attachment = forwardRef<HTMLDivElement, IAttachmentProps>(function Attachment(
  { img, imgFallback, title, desc, action, link, size = 'base', round = false,
    className, imgClassName, contentClassName, titleClassName, descClassName,
    renderImage, alt: altProp, loading = 'lazy', ...props },
  ref,
) {
  const sizeStyle = getAttachmentSizeStyle(size);
  const rootProps = withoutStyle(props);
  // 尺寸属性由组件拥有，防止调用方激活未配置的响应式断点。
  for (const key of Object.keys(rootProps)) {
    if (key === 'data-size' || key.startsWith('data-size-')) {
      delete (rootProps as Record<string, unknown>)[key];
    }
  }
  const textTitle = typeof title === 'string' || typeof title === 'number' ? String(title) : undefined;
  const alt = altProp ?? textTitle ?? '';
  const imageProps = {
    src: img || imgFallback,
    alt,
    loading,
    className: joinClassNames('bkreact-attachment__image', imgClassName),
  };
  const mainContent = (
    <>
      <Avatar className="bkreact-attachment__avatar" size={size} round={round}>
        {!renderImage && (
          <AvatarFallback role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined}>
            {textTitle !== undefined ? firstCharacter(textTitle) : null}
          </AvatarFallback>
        )}
        {renderImage ? renderImage({ img, imgFallback, title, size, round, imageProps }) : (
          <DefaultImage key={JSON.stringify([img, imgFallback])} img={img} imgFallback={imgFallback} {...imageProps} />
        )}
      </Avatar>
      {(title != null || desc != null) && (
        <div className={joinClassNames('bkreact-attachment__content', contentClassName)}>
          {title != null && <div className={joinClassNames('bkreact-attachment__title', titleClassName)} title={textTitle}>{title}</div>}
          {desc != null && <div className={joinClassNames('bkreact-attachment__desc', descClassName)} title={typeof desc === 'string' ? desc : undefined}>{desc}</div>}
        </div>
      )}
    </>
  );
  return (
    <div
      {...rootProps}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      className={joinClassNames('bkreact-attachment', className)}
      style={sizeStyle}
      // data-size 仅标记尺寸；CSS 断点由 data-size-* 激活。
      data-size={typeof size === 'string' ? size : 'responsive'}
    >
      {link ? (
        <a className="bkreact-attachment__main" href={link}>{mainContent}</a>
      ) : (
        <div className="bkreact-attachment__main">{mainContent}</div>
      )}
      {action != null && <div className="bkreact-attachment__action">{action}</div>}
    </div>
  );
});

Attachment.displayName = 'Attachment';
export default Attachment;
