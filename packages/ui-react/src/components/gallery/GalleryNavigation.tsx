import { Button } from '../button';
import { BKIcon } from '../icon';

import type { GalleryItem, GalleryLabels } from './type';

interface NavigationProps {
  items: GalleryItem[];
  index: number;
  labels: Required<GalleryLabels>;
  onSelect: (index: number) => void;
}

interface GalleryArrowsProps extends NavigationProps {
  loop: boolean;
}

const previousIcon = <BKIcon name="left" className="bkreact-gallery__arrow-icon" size="100%" renderInServer />;
const nextIcon = <BKIcon name="right" className="bkreact-gallery__arrow-icon" size="100%" renderInServer />;

export function GalleryArrows({ items, index, loop, labels, onSelect }: GalleryArrowsProps) {
  return (
    <>
      {(loop || index > 0) && (
        <Button
          className="bkreact-gallery__arrow"
          data-direction="previous"
          shape="square"
          round
          size="sm"
          aria-label={labels.previous}
          prefixIcon={previousIcon}
          onClick={() => onSelect(index - 1)}
        />
      )}
      {(loop || index < items.length - 1) && (
        <Button
          className="bkreact-gallery__arrow"
          data-direction="next"
          shape="square"
          round
          size="sm"
          aria-label={labels.next}
          prefixIcon={nextIcon}
          onClick={() => onSelect(index + 1)}
        />
      )}
    </>
  );
}

export function GalleryDots({ items, index, labels, onSelect }: NavigationProps) {
  return (
    <nav className="bkreact-gallery__dots" aria-label={labels.pagination}>
      {items.map((_, itemIndex) => (
        <Button
          key={itemIndex}
          variant="ghost"
          size="2xs"
          className="bkreact-gallery__dot"
          aria-label={labels.dot(itemIndex + 1)}
          aria-current={itemIndex === index ? 'true' : undefined}
          onClick={() => onSelect(itemIndex)}
        />
      ))}
    </nav>
  );
}

export function GalleryThumbnails({ items, index, labels, onSelect }: NavigationProps) {
  return (
    <nav className="bkreact-gallery__thumbnails" aria-label={labels.thumbnails}>
      {items.map((item, itemIndex) => {
        const isVideo = item.type === 'video';
        const hasImage = !isVideo || Boolean(item.poster);

        return (
          <Button
            key={itemIndex}
            variant="ghost"
            size="2xs"
            className="bkreact-gallery__thumbnail"
            aria-label={labels.thumbnail(itemIndex + 1)}
            aria-current={itemIndex === index ? 'true' : undefined}
            onClick={() => onSelect(itemIndex)}
          >
            {hasImage && <img src={isVideo ? item.poster : item.src} alt="" loading="lazy" />}
            {isVideo && <span className="bkreact-gallery__play" aria-hidden="true">▶</span>}
          </Button>
        );
      })}
    </nav>
  );
}
