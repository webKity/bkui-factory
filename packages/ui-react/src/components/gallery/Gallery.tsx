'use client';

import { GalleryMedia, GallerySnapshot } from './GalleryMedia';
import { GalleryArrows, GalleryDots, GalleryThumbnails } from './GalleryNavigation';
import { resolveGalleryLabels } from './labels';
import { useGallery } from './useGallery';
import './index.css';

import type { CSSProperties } from 'react';
import type { GalleryProps } from './type';

export function Gallery({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  showArrows = true,
  showDots = true,
  showCounter = true,
  showThumbnails = true,
  captionPosition = 'overlay',
  aspectRatio,
  objectFit = 'contain',
  className,
  emptyDescription,
  labels: labelOverrides,
}: GalleryProps) {
  const labels = resolveGalleryLabels(labelOverrides);
  const {
    activeIndex,
    item,
    mediaKey,
    motion,
    slideRef,
    select,
    onKeyDown,
    onAnimationEnd,
  } = useGallery({ items, index, defaultIndex, loop, onIndexChange });

  const multiple = items.length > 1;
  const direction = motion.direction > 0 ? 'next' : 'previous';
  const navigationProps = { items, index: activeIndex, labels, onSelect: select };
  const viewportStyle = aspectRatio
    ? { '--gallery-aspect-ratio': aspectRatio } as CSSProperties
    : undefined;
  const caption = item && (item.title || item.description) && (
    <div className="bkreact-gallery__caption" data-position={captionPosition}>
      {item.title && <div className="bkreact-gallery__title">{item.title}</div>}
      {item.description && <div className="bkreact-gallery__description">{item.description}</div>}
    </div>
  );

  return (
    <section
      className={['bkreact-gallery', className].filter(Boolean).join(' ')}
      role="region"
      aria-roledescription={labels.carouselRoleDescription}
      aria-label={labels.region}
      tabIndex={item ? 0 : undefined}
      onKeyDown={onKeyDown}
    >
      <div
        className="bkreact-gallery__viewport"
        data-dots={multiple && showDots ? '' : undefined}
        style={viewportStyle}
      >
        {item ? (
          <div
            key={motion.revision}
            ref={slideRef}
            className="bkreact-gallery__slide"
            data-motion={motion.outgoing ? 'enter' : undefined}
            data-direction={direction}
            role="group"
            aria-roledescription={labels.slideRoleDescription}
            aria-label={labels.slide(activeIndex + 1, items.length)}
            onAnimationEnd={onAnimationEnd}
          >
            <GalleryMedia key={mediaKey} item={item} objectFit={objectFit} labels={labels} />
          </div>
        ) : (
          <div className="bkreact-gallery__empty" role="status">{emptyDescription ?? labels.empty}</div>
        )}

        {motion.outgoing && (
          <GallerySnapshot
            key={`outgoing-${motion.revision}`}
            item={motion.outgoing}
            objectFit={objectFit}
            direction={direction}
          />
        )}

        {item && showCounter && (
          <span className="bkreact-gallery__counter" aria-live="polite" aria-atomic="true">
            {labels.counter(activeIndex + 1, items.length)}
          </span>
        )}
        {multiple && showArrows && <GalleryArrows {...navigationProps} loop={loop} />}
        {multiple && showDots && <GalleryDots {...navigationProps} />}
        {captionPosition === 'overlay' && caption}
      </div>

      {captionPosition === 'below' && caption}
      {item && showThumbnails && <GalleryThumbnails {...navigationProps} />}
    </section>
  );
}
