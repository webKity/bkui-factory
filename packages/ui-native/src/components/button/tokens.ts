import type { TextStyle } from 'react-native';
import type { IBKSize } from '../types/base';
import type { ButtonProps } from './type';
import type { NativeTheme } from '../themes/tokens';
import { createTokens } from './design.tokens';

export interface ButtonOptions extends Pick<ButtonProps, 'intent' | 'variant' | 'shape' | 'widthMode' | 'block' | 'disabled' | 'loading' | 'round'> {
  size?: IBKSize;
  pressed?: boolean;
  hovered?: boolean;
}

/** Pure design-state resolution, shared by RN rendering and its regression tests. */
export function resolveButtonTokens(theme: NativeTheme, {
  intent = 'normal', variant = 'fill', size = 'base',
  shape = 'rect', widthMode = 'auto', block = false,
  disabled = false, loading = false, pressed = false, hovered = false, round = false,
}: ButtonOptions = {}) {
  const button = createTokens(theme);
  const base = button.base;
  const tone = button.intents[intent];
  // 与 Web 相同：忙碌或禁用时不响应 hover / pressed 着色。
  pressed = !disabled && !loading && pressed;
  hovered = !disabled && !loading && hovered;
  const effectiveShape = block ? 'rect' : shape;
  const effectiveWidthMode = block || effectiveShape === 'square' ? 'auto' : widthMode;
  const dimensions = button.sizes[size];
  const square = effectiveShape === 'square';
  const paddingX = square ? base['shape-square-padding'] : dimensions['padding-x'];
  const paddingY = square ? base['shape-square-padding'] : dimensions['padding-y'];
  const width = square ? dimensions.height
    : effectiveWidthMode === 'fixed' ? dimensions['fixed-width'] + 2 * paddingX + 2 * base['border-width']
    : undefined;
  const outlined = variant === 'outline' || variant === 'ghost';
  const background = disabled ? (outlined ? 'transparent' : base['disabled-bg'])
    : pressed ? (outlined ? base['outline-active-bg'] : tone['tone-active-bg'])
    : hovered ? (outlined ? base['outline-hover-bg'] : tone['tone-hover-bg'])
    : outlined ? 'transparent' : tone['tone-bg'];
  const color = disabled ? base['disabled-color'] : tone[outlined ? 'tone-outline-color' : 'tone-color'];
  const borderColor = variant === 'ghost' ? 'transparent' : disabled ? base['disabled-border-color']
    : outlined ? tone['tone-outline-color'] : pressed ? tone['tone-active-bg'] : hovered ? tone['tone-hover-bg'] : tone['tone-border-color'];
  return {
    ...dimensions, color, background, borderColor,
    shape: effectiveShape, widthMode: effectiveWidthMode, block, width,
    'padding-x': paddingX, 'padding-y': paddingY,
    contentGap: base['content-gap'],
    spinnerBorderWidth: base['spinner-border-width'],
    spinnerDuration: base['spinner-duration-ms'],
    loadingDuration: base['loading-duration-ms'],
    fontWeight: String(base['font-weight']) as TextStyle['fontWeight'],
    borderWidth: base['border-width'],
    radius: base[round ? 'round-border-radius' : 'border-radius'],
    opacity: disabled ? base['disabled-opacity'] : loading ? base['loading-opacity'] : 1,
  };
}

export function getButtonVariables(token: ReturnType<typeof resolveButtonTokens>): Record<`--${string}`, string | number> {
  return {
    ...(token.width === undefined ? {} : { '--bk-button-width': `${token.width}px` }),
    '--bk-button-icon-size': `${token['icon-size']}px`,
    '--bk-button-content-gap': `${token.contentGap}px`,
    '--bk-button-height': `${token.height}px`,
    '--bk-button-padding-x': `${token['padding-x']}px`,
    '--bk-button-padding-y': `${token['padding-y']}px`,
    '--bk-button-gap': `${token.gap}px`,
    '--bk-button-radius': `${token.radius}px`,
    '--bk-button-border-width': `${token.borderWidth}px`,
    '--bk-button-border-color': token.borderColor,
    '--bk-button-bg': token.background,
    '--bk-button-opacity': token.opacity,
    '--bk-button-color': token.color,
    '--bk-button-font-size': `${token['font-size']}px`,
    '--bk-button-line-height': `${token['line-height']}px`,
    '--bk-button-font-weight': String(token.fontWeight),
  };
}
