
import type { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import type { IBKSize, IBKResponsiveSize } from '../types/base';

export type AvatarProps = Omit<AvatarPrimitive.Root.Props, 'style'> & {
  /** 圆形头像；默认 false，使用圆角方形。 */
  round?: boolean;
  /** 响应式对象必须提供 base；无效配置在渲染期抛错，外部数据请先在边界校验。 */
  size?: IBKSize | IBKResponsiveSize;
};

/** loading="lazy" 需配合 keepMounted；图片层级固定高于 Fallback，不依赖 DOM 顺序。 */
export type AvatarImageProps = Omit<AvatarPrimitive.Image.Props, 'style'>;
export type AvatarFallbackProps = Omit<AvatarPrimitive.Fallback.Props, 'style'>;
