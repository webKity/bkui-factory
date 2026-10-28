
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

export interface GalleryProps {
  items: GalleryItem[];
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
  defaultIndex?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  captionPosition?: 'overlay' | 'below';
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover';
  closeLabel?: string;
  onIndexChange?: (index: number, item: GalleryItem) => void;
  onClose?: () => void;
}