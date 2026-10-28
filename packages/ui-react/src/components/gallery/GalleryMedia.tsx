import { useState } from 'react';

import type { GalleryItem, GalleryLabels, GalleryProps } from './type';

type MediaOptions = {
  item: GalleryItem;
  objectFit: GalleryProps['objectFit'];
};

interface GalleryMediaProps extends MediaOptions {
  labels: Required<GalleryLabels>;
}

interface GallerySnapshotProps extends MediaOptions {
  direction: 'next' | 'previous';
}

export function GalleryMedia({ item, objectFit, labels }: GalleryMediaProps) {
  const [failed, setFailed] = useState(false);
  const onError = () => setFailed(true);

  if (failed) {
    return <div className="bkreact-gallery__empty" role="status">{labels.mediaError}</div>;
  }

  if (item.type === 'video') {
    return (
      <video
        className="bkreact-gallery__media"
        style={{ objectFit }}
        src={item.src}
        poster={item.poster}
        controls
        playsInline
        preload="metadata"
        aria-label={item.alt ?? item.title ?? labels.video}
        onError={onError}
      />
    );
  }

  return (
    <img
      className="bkreact-gallery__media"
      style={{ objectFit }}
      src={item.src}
      alt={item.alt ?? item.title ?? ''}
      onError={onError}
    />
  );
}

function makeInert(element: HTMLDivElement | null) {
  // 通过 DOM 写入标准空属性，兼容 React 18 / 19。
  element?.setAttribute('inert', '');
}

export function GallerySnapshot({ item, objectFit, direction }: GallerySnapshotProps) {
  const isVideo = item.type === 'video';
  const hasImage = !isVideo || Boolean(item.poster);

  return (
    <div
      ref={makeInert}
      className="bkreact-gallery__outgoing"
      data-direction={direction}
      aria-hidden="true"
    >
      {/* 视频立即卸载，退场仅展示 poster，避免隐藏的视频继续播放。 */}
      {hasImage && (
        <img
          className="bkreact-gallery__snapshot"
          src={isVideo ? item.poster : item.src}
          alt=""
          style={{ objectFit }}
        />
      )}
    </div>
  );
}
