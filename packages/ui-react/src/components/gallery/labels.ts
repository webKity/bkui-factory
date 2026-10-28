import type { GalleryLabels } from './type';

export const defaultGalleryLabels: Required<GalleryLabels> = {
  region: 'Media gallery',
  video: 'Video',
  previous: 'Previous item',
  next: 'Next item',
  carouselRoleDescription: 'carousel',
  slideRoleDescription: 'slide',
  pagination: 'Gallery pagination',
  thumbnails: 'Gallery thumbnails',
  slide: (position, total) => `${position} of ${total}`,
  dot: position => `Go to item ${position}`,
  thumbnail: position => `View item ${position}`,
  counter: (position, total) => `${position} / ${total}`,
  close: 'Close gallery',
  empty: 'No media',
  mediaError: 'Failed to load media',
};

export function resolveGalleryLabels(labels?: GalleryLabels): Required<GalleryLabels> {
  const result = { ...defaultGalleryLabels };
  // 显式 undefined 同样使用默认值。
  for (const key of Object.keys(result) as (keyof GalleryLabels)[]) {
    if (labels?.[key] !== undefined) {
      Object.assign(result, { [key]: labels[key] });
    }
  }
  return result;
}
