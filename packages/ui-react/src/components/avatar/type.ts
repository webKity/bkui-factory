
import type { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import type { IBKSize, IBKResponsiveSize } from '../types/base';

export type AvatarProps = Omit<AvatarPrimitive.Root.Props, 'style'> & {
  /** 圆形头像；默认 false，使用圆角方形。 */
  round?: boolean;
  size?: IBKSize | IBKResponsiveSize;
};

export type AvatarImageProps = Omit<AvatarPrimitive.Image.Props, 'style'>;
export type AvatarFallbackProps = Omit<AvatarPrimitive.Fallback.Props, 'style'>;
