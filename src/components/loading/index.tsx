'use client';

import { forwardRef } from 'react';
import { BKIcon } from '../icon';
import { joinClassNames } from '../utils';
import { LogoLoading } from './logo';
import { getLoadingSizeStyle } from './size';
import './index.css';

import type { CSSProperties } from 'react';
import type { LoadingProps } from './type';
export type { LoadingProps, LoadingType, LoadingSize } from './type';

export const Loading = forwardRef<HTMLSpanElement, LoadingProps>(function Loading({
  type = 'normal', size = 'base', fillColor, speed, className, style,
  ariaLabel, 'aria-label': nativeLabel, 'aria-labelledby': labelledBy,
  'aria-hidden': ariaHidden, role, ...rest
}, ref) {
  const hidden = ariaHidden === true || ariaHidden === 'true';
  const loadingStyle = {
    ...getLoadingSizeStyle(size),
    ...(fillColor !== undefined ? { '--loading-color': fillColor } : {}),
    ...(speed !== undefined && Number.isFinite(speed) && speed > 0 ? { '--loading-duration': `${speed}ms` } : {}),
    ...style,
  } as CSSProperties;

  return (
    <span
      {...rest}
      ref={ref}
      className={joinClassNames('bkreact-loading', className)}
      data-type={type}
      data-size={typeof size === 'object' ? 'responsive' : size}
      role={hidden ? undefined : role ?? 'status'}
      aria-hidden={ariaHidden}
      aria-label={hidden || labelledBy ? undefined : ariaLabel ?? nativeLabel ?? '加载中'}
      aria-labelledby={hidden ? undefined : labelledBy}
      style={loadingStyle}
    >
      {type === 'logo' ? <LogoLoading /> : type === 'rect' ? (
        <span className="bkreact-loading__bars" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <span key={index} className="bkreact-loading__bar" />)}
        </span>
      ) : (
        <BKIcon name="loader" size="100%" className="bkreact-loading__icon animate-spin" renderInServer />
      )}
    </span>
  );
});

Loading.displayName = 'Loading';
export default Loading;
