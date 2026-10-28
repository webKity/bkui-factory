import type { ReactNode } from 'react';

export type GalleryMediaType = 'image' | 'video';

export interface GalleryItem {
  type?: GalleryMediaType;
  src: string;
  poster?: string;
  title?: string;
  description?: string;
  alt?: string;
}

/** 可按需覆盖；默认文案为英文。函数接收从 1 开始的位置。 */
export interface GalleryLabels {
  region?: string;
  video?: string;
  previous?: string;
  next?: string;
  carouselRoleDescription?: string;
  slideRoleDescription?: string;
  pagination?: string;
  thumbnails?: string;
  slide?: (position: number, total: number) => string;
  dot?: (position: number) => string;
  thumbnail?: (position: number) => string;
  counter?: (position: number, total: number) => string;
  close?: string;
  empty?: ReactNode;
  mediaError?: ReactNode;
}

export interface GalleryProps {
  items: GalleryItem[];
  labels?: GalleryLabels;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number, item: GalleryItem) => void;
  loop?: boolean;
  showArrows?: boolean;
  /** 圆点指示器（悬浮在视口底部） */
  showDots?: boolean;
  /** 左上角数字计数器 */
  showCounter?: boolean;
  /** 底部缩略图导航，可单独关闭 */
  showThumbnails?: boolean;
  captionPosition?: 'overlay' | 'below';
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover';
  className?: string;
  emptyDescription?: ReactNode;
}

export interface ShowGalleryOptions {
  items: GalleryItem[];
  labels?: GalleryLabels;
  defaultIndex?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  captionPosition?: 'overlay' | 'below';
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover';
  /** 优先于 labels.close，兼容已有调用。 */
  closeLabel?: string;
  onIndexChange?: (index: number, item: GalleryItem) => void;
  onClose?: () => void;
}
