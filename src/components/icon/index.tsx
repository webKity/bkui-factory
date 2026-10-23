'use client';

import { useIdleReady } from '../hooks/useIdleReady';
import { joinClassNames } from '../utils';
import { getIconDefinition } from './registry';
import './index.css';

import type { CSSProperties, HTMLAttributes } from 'react';
import type { IconName, IconVariant } from './registry';

export type { IconName, IconVariant, FigmaIconName } from './registry';

export { iconNames, figmaIconNames } from './registry';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'children' | 'dangerouslySetInnerHTML'> {
  name: IconName;
  /** Explicitly selects a Figma variant, including names shared with legacy icons. */
  variant?: IconVariant;
  ariaLabel?: string;
  color?: string;
  hoverColor?: string;
  size?: number | string;
  renderInServer?: boolean;
}

export const BKIcon = (props: IconProps) => {
  const mounted = useIdleReady();
  const {
    name, variant, size = 16, className, color, hoverColor, ariaLabel,
    renderInServer = false, style, onClick, 'aria-label': nativeLabel, ...rest
  } = props;
  const icon = getIconDefinition(name, variant);
  if (!icon) return null;

  const ready = mounted || renderInServer;
  const label = ariaLabel ?? nativeLabel;
  const iconStyle = {
    '--bk-icon-color': color ?? 'currentColor',
    '--bk-icon-hover-color': hoverColor ?? color ?? 'currentColor',
    '--bk-icon-explicit-color': color || hoverColor ? 'currentColor' : undefined,
    width: size,
    height: size,
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  } as CSSProperties;

  return (
    <span
      {...rest}
      className={joinClassNames('bk-icon', className)}
      data-placeholder={!ready ? '' : undefined}
      data-hover-color={hoverColor ? '' : undefined}
      aria-hidden={!ready ? true : rest['aria-hidden']}
      onClick={onClick}
      style={iconStyle}
    >
      {ready && (
        <svg
          viewBox={icon.viewBox}
          width={size}
          height={size}
          fill="none"
          role={label ? 'img' : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          focusable="false"
        >
          {icon.paths.map(({ fill, ...path }, index) => (
            <path
              key={index}
              {...path}
              fill={fill && !['none', 'currentColor'].includes(fill)
                ? `var(--bk-icon-explicit-color, ${fill})`
                : fill}
            />
          ))}
        </svg>
      )}
    </span>
  );
};
