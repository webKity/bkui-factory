import type { TextStyle } from 'react-native';
import type { IBKIntent, IBKVariants, IBKSize } from '../types/base';
import { themes } from '../themes/tokens';
import type { ThemeName } from '../themes/tokens';
import { tokens as buttonTokens } from './design.tokens';

export interface ButtonOptions {
  intent?: IBKIntent;
  variant?: IBKVariants;
  size?: IBKSize;
  disabled?: boolean;
  loading?: boolean;
  pressed?: boolean;
  round?: boolean;
}

/** Pure design-state resolution, shared by RN rendering and its regression tests. */
export function resolveButtonTokens(mode: ThemeName, {
  intent = 'normal', variant = 'fill', size = 'base',
  disabled = false, loading = false, pressed = false, round = false,
}: ButtonOptions = {}) {
  const theme = themes[mode];
  const button = buttonTokens[mode];
  const base = button.base;
  const tone = { ...base, ...button.intents[intent] };
  const outlined = variant === 'outline' || variant === 'ghost';
  const background = disabled ? (outlined ? 'transparent' : base['disabled-bg'])
    : pressed ? (outlined ? theme.semantic['color-fill-active'] : tone['tone-active-bg'])
    : outlined ? 'transparent' : tone['tone-bg'];
  const color = disabled ? base['disabled-color'] : tone[outlined ? 'tone-outline-color' : 'tone-color'];
  const borderColor = variant === 'ghost' ? 'transparent' : disabled ? base['disabled-border-color']
    : outlined ? tone['tone-outline-color'] : pressed ? tone['tone-active-bg'] : tone['tone-border-color'];
  return {
    ...button.sizes[size], color, background, borderColor,
    fontWeight: String(base['font-weight']) as TextStyle['fontWeight'],
    borderWidth: base['border-width'],
    radius: base[round ? 'round-border-radius' : 'border-radius'],
    opacity: disabled ? base['disabled-opacity'] : loading ? base['loading-opacity'] : 1,
  };
}

export function getButtonVariables(mode: ThemeName, options: ButtonOptions): Record<`--${string}`, string | number> {
  const token = resolveButtonTokens(mode, options);
  return {
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
