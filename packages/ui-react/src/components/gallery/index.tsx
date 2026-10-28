'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../button';
import { BKIcon } from '../icon';
import './index.css';

import type { KeyboardEvent } from 'react';
import type { GalleryItem, GalleryProps } from './type';

export type { GalleryItem, GalleryMediaType, GalleryProps, ShowGalleryOptions } from './type';
export { showGallery } from './showGallery';

function normalizeIndex(index: number, length: number) {
  return Math.max(0, Math.min(Number.isFinite(index) ? Math.trunc(index) : 0, length - 1));
}

function Media({ item, objectFit }: { item: GalleryItem; objectFit: GalleryProps['objectFit'] }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="bkreact-gallery__empty" role="status">媒体加载失败</div>;
  return item.type === 'video'
    ? <video className="bkreact-gallery__media" style={{ objectFit }} src={item.src} poster={item.poster} controls playsInline preload="metadata" aria-label="Video" onError={() => setFailed(true)} />
    : <img className="bkreact-gallery__media" style={{ objectFit }} src={item.src} alt={item.alt ?? item.title ?? ''} onError={() => setFailed(true)} />;
}

const previousIcon = <BKIcon name="left" size="100%" renderInServer />;
const nextIcon = <BKIcon name="right" size="100%" renderInServer />;

export function Gallery({
  items, index, defaultIndex = 0, onIndexChange, loop = false,
  showArrows = true, showDots = true, showCounter = true, showThumbnails = true,
  captionPosition = 'overlay', aspectRatio = '16 / 9', objectFit = 'contain',
  className, emptyDescription = '暂无媒体',
}: GalleryProps) {
  const [navigation, setNavigation] = useState({ index: defaultIndex, from: defaultIndex, direction: 1 });
  const activeIndex = normalizeIndex(index ?? navigation.index, items.length);
  const item = items[activeIndex];
  const multiple = items.length > 1;
  const mediaKey = item ? `${activeIndex}:${item.type}:${item.src}` : 'empty';
  const [motion, setMotion] = useState({
    key: mediaKey, index: activeIndex, item, outgoing: undefined as GalleryItem | undefined,
    direction: 1, revision: 0,
  });
  const slideRef = useRef<HTMLDivElement>(null);

  // 在渲染新项目时保存上一项；受控索引的外部更新也会进入同一过渡。
  if (motion.key !== mediaKey) {
    const direction = navigation.from === motion.index && navigation.index === activeIndex
      ? navigation.direction : activeIndex > motion.index ? 1 : -1;
    setMotion({ key: mediaKey, index: activeIndex, item, outgoing: item ? motion.item : undefined, direction, revision: motion.revision + 1 });
  }

  useEffect(() => {
    if (!motion.outgoing || !slideRef.current) return;
    const revision = motion.revision;
    const style = getComputedStyle(slideRef.current);
    const toMs = (value: string) => (parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);
    const durations = style.animationDuration.split(',').map(toMs);
    const delays = style.animationDelay.split(',').map(toMs);
    const duration = style.animationName === 'none' ? 0 : Math.max(0, ...durations.map((value, i) => value + delays[i % delays.length]));
    const finish = () => setMotion(current => current.revision === revision ? { ...current, outgoing: undefined } : current);
    // 动画被禁用（含 reduced-motion）时直接清理；计时器处理未派发 animationend 的情况。
    if (!duration) { finish(); return; }
    const timer = setTimeout(finish, duration + 50);
    return () => clearTimeout(timer);
  }, [motion.revision, motion.outgoing]);

  function select(next: number) {
    const normalized = loop && items.length ? (next % items.length + items.length) % items.length : normalizeIndex(next, items.length);
    if (!items[normalized] || normalized === activeIndex) return;
    setNavigation({ index: normalized, from: activeIndex, direction: next > activeIndex ? 1 : -1 });
    onIndexChange?.(normalized, items[normalized]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // 保留视频原生快捷键，以及嵌入容器中的输入行为。
    if ((event.target as HTMLElement).closest('video, input, textarea, select, [contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: items.length - 1 }[event.key];
    if (target === undefined || !multiple) return;
    event.preventDefault();
    select(target);
  }

  const caption = item && (item.title || item.description) && (
    <div className="bkreact-gallery__caption" data-position={captionPosition}>
      {item.title && <div className="bkreact-gallery__title">{item.title}</div>}
      {item.description && <div className="bkreact-gallery__description">{item.description}</div>}
    </div>
  );

  return (
    <section className={['bkreact-gallery', className].filter(Boolean).join(' ')} role="region" aria-roledescription="carousel" aria-label="Media gallery" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="bkreact-gallery__viewport" data-dots={multiple && showDots || undefined} style={{ aspectRatio }}>
        {
          item ? (
            <div key={motion.revision} ref={slideRef} className="bkreact-gallery__slide" data-motion={motion.outgoing ? 'enter' : undefined} data-direction={motion.direction > 0 ? 'next' : 'previous'} role="group" aria-roledescription="slide" aria-label={`${activeIndex + 1} of ${items.length}`}
              onAnimationEnd={event => {
                if (event.target !== event.currentTarget || event.animationName !== 'bk-gallery-enter') return;
                const revision = motion.revision;
                setMotion(current => current.revision === revision ? { ...current, outgoing: undefined } : current);
              }}>
              <Media key={mediaKey} item={item} objectFit={objectFit} />
            </div>
          ) : <div className="bkreact-gallery__empty" role="status">{emptyDescription}</div>
        }

        {
          motion.outgoing && (
            <div key={`outgoing-${motion.revision}`} className="bkreact-gallery__outgoing" data-direction={motion.direction > 0 ? 'next' : 'previous'} aria-hidden="true" inert>
              {/* 视频立即卸载，退场仅展示 poster，避免隐藏的视频继续播放。 */}
              {(motion.outgoing.type !== 'video' || motion.outgoing.poster) && <img className="bkreact-gallery__snapshot" src={motion.outgoing.type === 'video' ? motion.outgoing.poster : motion.outgoing.src} alt="" style={{ objectFit }} />}
            </div>
          )
        }

        {item && showCounter && <span className="bkreact-gallery__counter" aria-live="polite" aria-atomic="true">{activeIndex + 1} / {items.length}</span>}
        
        {
          multiple && showArrows && (
            <>
              {(loop || activeIndex > 0) && <Button className="bkreact-gallery__arrow" data-direction="previous" shape="square" round size="sm" aria-label="Previous item" prefixIcon={previousIcon} onClick={() => select(activeIndex - 1)} />}
              {(loop || activeIndex < items.length - 1) && <Button className="bkreact-gallery__arrow" data-direction="next" shape="square" round size="sm" aria-label="Next item" prefixIcon={nextIcon} onClick={() => select(activeIndex + 1)} />}
            </>
          )
        }

        {
          multiple && showDots && (
            <nav className="bkreact-gallery__dots" aria-label="Gallery pagination">
              {items.map((_, i) => <Button key={i} variant="ghost" size="2xs" className="bkreact-gallery__dot" aria-label={`Go to item ${i + 1}`} aria-current={i === activeIndex ? 'true' : undefined} onClick={() => select(i)} />)}
            </nav>
          )
        }
        {captionPosition === 'overlay' && caption}
      </div>
      
      {captionPosition === 'below' && caption}

      {
        item && showThumbnails && (
          <nav className="bkreact-gallery__thumbnails" aria-label="Gallery thumbnails">
            {items.map((entry, i) => <Button key={i} variant="ghost" size="2xs" className="bkreact-gallery__thumbnail" aria-label={`View item ${i + 1}`} aria-current={i === activeIndex ? 'true' : undefined} onClick={() => select(i)}>
              {entry.type !== 'video' || entry.poster ? <img src={entry.type === 'video' ? entry.poster : entry.src} alt="" loading="lazy" /> : <span aria-hidden="true">▶</span>}
              {entry.type === 'video' && entry.poster && <span className="bkreact-gallery__play" aria-hidden="true">▶</span>}
            </Button>)}
          </nav>
        )
      }
    </section>
  );
}

export default Gallery;
