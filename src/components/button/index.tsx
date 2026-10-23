'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { Children, forwardRef } from 'react';
import { getButtonSizeStyle } from './size';
import { Loading } from '../loading';
import './index.css';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, MouseEvent, Ref } from 'react';
import type { ButtonComponent, ButtonProps } from './type';

export type { ButtonProps, ButtonNativeProps, ButtonLinkProps } from './type';

function preventActivation(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

const ButtonImpl = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(props, ref) {
  const {
    children,
    prefixIcon,
    suffixIcon,
    className,
    intent = 'normal',
    variant = 'fill',
    size = 'base',
    block = false,
    round = false,
    disabled = false,
    loading = false,
    link,
    type = 'button',
    onClick,
    ...restProps
  } = props;
  const isDisabled = disabled || loading;
  const hasLabel = Children.toArray(children).length > 0;
  const needsLoadingLabel = loading && !hasLabel && !props['aria-label'] && !props['aria-labelledby'];
  const hasLeading = loading || prefixIcon != null;
  const commonProps = {
    className: ['bk-button', className].filter(Boolean).join(' '),
    style: getButtonSizeStyle(size),
    'data-intent': intent,
    'data-variant': variant,
    'data-size': typeof size === 'string' ? size : 'responsive',
    'data-block': block ? '' : undefined,
    'data-round': round ? '' : undefined,
    'data-loading': loading ? '' : undefined,
    'aria-busy': loading || undefined,
    // Base UI 仅 preventDefault；捕获阶段还需阻止事件冒泡到父容器。
    ...(isDisabled ? { onClickCapture: preventActivation, onAuxClickCapture: preventActivation } : {}),
  } as const;
  const content = (
    <span className="bk-button__content">
      <span
        className="bk-button__leading"
        aria-hidden="true"
        data-visible={hasLeading ? '' : undefined}
        data-spacing={hasLabel || suffixIcon != null ? '' : undefined}
      >
        <span className="bk-button__leading-inner">
          {loading
            ? <Loading
                type="normal"
                className="bk-button__loading"
                aria-hidden="true"
                style={{ '--loading-size': 'var(--button-icon-size)' } as CSSProperties}
              />
            : prefixIcon != null && <span className="bk-button__icon" aria-hidden="true">{prefixIcon}</span>}
        </span>
      </span>
      {hasLabel && <span className="bk-button__label">{children}</span>}
      {needsLoadingLabel && <span className="bk-button__sr-only">加载中</span>}
      {suffixIcon != null && <span className="bk-button__icon bk-button__suffix" data-spacing={hasLabel ? '' : undefined} aria-hidden="true">{suffixIcon}</span>}
    </span>
  );

  // 链接保留浏览器原生的导航、打开新标签页及键盘语义。
  if (props.link !== undefined) {
    return (
      <a
        {...restProps as AnchorHTMLAttributes<HTMLAnchorElement>}
        {...commonProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : props.link}
        role={props.role ?? (isDisabled ? 'link' : undefined)}
        tabIndex={disabled ? -1 : loading ? 0 : props.tabIndex}
        aria-disabled={isDisabled || undefined}
        data-disabled={isDisabled ? '' : undefined}
        onClick={isDisabled ? undefined : props.onClick}
        onAuxClick={isDisabled ? undefined : props.onAuxClick}
      >
        {content}
      </a>
    );
  }

  return (
    <BaseButton
      {...restProps as ButtonHTMLAttributes<HTMLButtonElement>}
      {...commonProps}
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      disabled={isDisabled}
      focusableWhenDisabled={loading && !disabled}
      onClick={props.onClick}
    >
      {content}
    </BaseButton>
  );
});

ButtonImpl.displayName = 'Button';
export const Button = ButtonImpl as ButtonComponent;
export default Button;
