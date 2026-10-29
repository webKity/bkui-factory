'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { Children, forwardRef } from 'react';
import { getButtonSizeStyle } from './size';
import { getResponsiveSizeAttributes } from '../utils/size';
import './index.css';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import type { ButtonComponent, ButtonProps, ButtonShape, ButtonWidthMode } from './type';

export type {
  ButtonProps,
  ButtonNativeProps,
  ButtonLinkProps,
  ButtonShape,
  ButtonWidthMode,
} from './type';

function preventActivation(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

const ButtonImpl = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      children,
      prefixIcon,
      suffixIcon,
      className,
      intent = 'normal',
      variant = 'fill',
      shape = 'rect',
      widthMode = 'auto',
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
    const hasLeading = loading || prefixIcon != null;

    // 优先级：block > shape > widthMode。
    const effectiveShape: ButtonShape = block ? 'rect' : shape;
    const effectiveWidthMode: ButtonWidthMode =
      block || effectiveShape !== 'rect' ? 'auto' : widthMode;

    if (process.env.NODE_ENV !== 'production') {
      if (block && shape !== 'rect') {
        console.warn(
          `[Button] shape="${shape}" 与 block 冲突，block 场景下 shape 会被降级为 "rect"。`,
        );
      }

      if (block && widthMode === 'fixed') {
        console.warn(
          `[Button] widthMode="fixed" 与 block 冲突，block 场景下 widthMode 会被降级为 "auto"。`,
        );
      }

      if (shape !== 'rect' && widthMode === 'fixed' && !block) {
        console.warn(
          `[Button] widthMode="fixed" 与 shape="${shape}" 冲突，shape 优先，widthMode 会被降级为 "auto"。`,
        );
      }
    }

    const commonProps = {
      className: ['bk-button', className].filter(Boolean).join(' '),
      style: getButtonSizeStyle(size),
      ...getResponsiveSizeAttributes(size),
      'data-intent': intent,
      'data-variant': variant,
      'data-shape': effectiveShape !== 'rect' ? effectiveShape : undefined,
      'data-width-mode': effectiveWidthMode !== 'auto' ? effectiveWidthMode : undefined,
      'data-size': typeof size === 'string' ? size : 'responsive',
      'data-block': block || undefined,
      'data-round': round || undefined,
      // 视觉层：data-disabled 只由真正的 disabled 触发，loading 走独立的 data-loading 样式。
      'data-disabled': disabled || undefined,
      'data-loading': loading || undefined,
      'aria-busy': loading || undefined,
      // 阻止禁用、加载中的按钮触发父容器的点击行为。
      ...(isDisabled
        ? { onClickCapture: preventActivation, onAuxClickCapture: preventActivation }
        : {}),
    } as const;

    const content = (
      <span className="bk-button__content">
        <span
          className="bk-button__leading"
          aria-hidden="true"
          data-visible={hasLeading || undefined}
          data-spacing={hasLabel || suffixIcon != null || undefined}
        >
          <span className="bk-button__leading-inner">
            {loading ? (
              <span className="bk-button__spinner" aria-hidden="true" />
            ) : (
              prefixIcon != null && (
                <span className="bk-button__icon" aria-hidden="true">
                  {prefixIcon}
                </span>
              )
            )}
          </span>
        </span>
        {hasLabel && <span className="bk-button__label">{children}</span>}
        {suffixIcon != null && (
          <span
            className="bk-button__icon bk-button__suffix"
            data-spacing={hasLabel || undefined}
            aria-hidden="true"
          >
            {suffixIcon}
          </span>
        )}
      </span>
    );

    // 链接保留浏览器原生的导航、打开新标签页及键盘语义。
    if (props.link !== undefined) {
      return (
        <a
          {...(restProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...commonProps}
          ref={ref as Ref<HTMLAnchorElement>}
          href={isDisabled ? undefined : props.link}
          role={props.role ?? (isDisabled ? 'link' : undefined)}
          tabIndex={disabled ? -1 : loading ? 0 : props.tabIndex}
          aria-disabled={isDisabled || undefined}
          onClick={isDisabled ? preventActivation : props.onClick}
          onAuxClick={isDisabled ? preventActivation : props.onAuxClick}
        >
          {content}
        </a>
      );
    }

    return (
      <BaseButton
        {...(restProps as ButtonHTMLAttributes<HTMLButtonElement>)}
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
  },
);

ButtonImpl.displayName = 'Button';

export const Button = ButtonImpl as ButtonComponent;

export default Button;
