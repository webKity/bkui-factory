'use client';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { forwardRef } from 'react';
import { joinClassNames, withoutStyle } from '../utils/styles';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getAvatarSizeStyle } from './size';
import type { AvatarProps, AvatarImageProps, AvatarFallbackProps } from './type';
import './index.css';

export type { AvatarProps, AvatarImageProps, AvatarFallbackProps } from './type';

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, size = 'base', round = false, ...props },
  ref,
) {
  const sizeStyle = getAvatarSizeStyle(size);
  const rootProps = withoutStyle(props);
  for (const key of Object.keys(rootProps)) {
    if (key === 'data-size' || key.startsWith('data-size-')) {
      delete (rootProps as Record<string, unknown>)[key];
    }
  }

  return (
    <AvatarPrimitive.Root
      {...rootProps}
      {...getResponsiveSizeAttributes(size)}
      ref={ref}
      className={state => joinClassNames(
        'bkreact-avatar',
        typeof className === 'function' ? className(state) : className,
      )}
      style={sizeStyle}
      data-size={typeof size === 'string' ? size : 'responsive'}
      data-round={round || undefined}
    />
  );
});

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(function AvatarImage(
  { className, ...props },
  ref,
) {
  return (
    <AvatarPrimitive.Image
      {...withoutStyle(props)}
      ref={ref}
      className={state => joinClassNames(
        'bkreact-avatar__image',
        typeof className === 'function' ? className(state) : className,
      )}
    />
  );
});

export const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(function AvatarFallback(
  { className, ...props },
  ref,
) {
  return (
    <AvatarPrimitive.Fallback
      {...withoutStyle(props)}
      ref={ref}
      className={state => joinClassNames(
        'bkreact-avatar__fallback',
        typeof className === 'function' ? className(state) : className,
      )}
    />
  );
});

Avatar.displayName = 'Avatar';
AvatarImage.displayName = 'AvatarImage';
AvatarFallback.displayName = 'AvatarFallback';

export default Avatar;
