'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { Children, forwardRef } from 'react';
import { getResponsiveSizeAttributes } from '../utils/size';
import { getButtonSizeStyle } from './size';
import './index.css';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
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

  // 行为禁用：disabled 或 loading 都阻止交互（点击、导航）
  const isDisabled = disabled || loading;
  const hasLabel = Children.toArray(children).length > 0;
  const hasLeading = loading || prefixIcon != null;

  const commonProps = {
    className: ['bkreact-button', className].filter(Boolean).join(' '),
    style: getButtonSizeStyle(size),
    ...getResponsiveSizeAttributes(size),
    'data-intent': intent,
    'data-variant': variant,
    'data-size': typeof size === 'string' ? size : 'responsive',
    'data-block': block || undefined,
    'data-round': round || undefined,
    // 视觉层：data-disabled 只由真正的 disabled 触发，loading 走独立的 data-loading 样式，
    // 避免 loading 时被 disabled 的灰底/灰字覆盖掉当前 intent 色彩。
    'data-disabled': disabled || undefined,
    'data-loading': loading || undefined,
    'aria-busy': loading || undefined,
    // 阻止禁用、加载中的按钮触发父容器的点击行为。
    ...(isDisabled ? { onClickCapture: preventActivation, onAuxClickCapture: preventActivation } : {}),
  } as const;

  const content = (
    <span className="bkreact-button__content">
      <span
        className="bkreact-button__leading"
        aria-hidden="true"
        data-visible={hasLeading || undefined}
        data-spacing={hasLabel || suffixIcon != null || undefined}
      >
        <span className="bkreact-button__leading-inner">
          {loading || prefixIcon == null
            ? <span className="bkreact-button__spinner" aria-hidden="true" />
            : <span className="bkreact-button__icon" aria-hidden="true">{prefixIcon}</span>}
        </span>
      </span>
      {hasLabel && <span className="bkreact-button__label">{children}</span>}
      {suffixIcon != null && <span className="bkreact-button__icon bkreact-button__suffix" data-spacing={hasLabel || undefined} aria-hidden="true">{suffixIcon}</span>}
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
        // disabled 退出 Tab 顺序；纯 loading 保留键盘焦点入口。
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
      {...restProps as ButtonHTMLAttributes<HTMLButtonElement>}
      {...commonProps}
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      disabled={isDisabled}
      // Base UI 在 focusableWhenDisabled 时会移除原生 disabled，改用 aria-disabled，
      // 这样 loading 中仍可聚焦，spinner 变化能被屏幕阅读器感知。
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
