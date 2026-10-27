import { twMerge } from 'tailwind-merge';
import { forwardRef, useState } from 'react';
import type { ElementRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { View } from 'react-native';
import { VariableContextProvider } from 'nativewind';
import { useThemeContext } from '../themes';
import { StyledPressable, StyledText } from '../utils/styled';
import { useResponsiveSize } from '../utils/size';
import { Loading } from '../loading';
import { getButtonVariables, resolveButtonTokens } from './tokens';
import type { ButtonProps } from './type';
export type { ButtonProps } from './type';

// Keep static utility names visible to Tailwind and keep component styles beside the render code.
const buttonClassName = [
  'flex-row items-center justify-center',
  'min-h-[var(--bk-button-height)]',
  'px-[var(--bk-button-padding-x)] py-[var(--bk-button-padding-y)] gap-[var(--bk-button-gap)]',
  'rounded-[var(--bk-button-radius)] border-[length:var(--bk-button-border-width)]',
  'border-[color:var(--bk-button-border-color)] bg-[var(--bk-button-bg)] opacity-[var(--bk-button-opacity)]',
].join(' ');
const labelClassName = [
  'text-[color:var(--bk-button-color)] text-[length:var(--bk-button-font-size)]',
  'leading-[var(--bk-button-line-height)] font-[number:var(--bk-button-font-weight)]',
].join(' ');

export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<ElementRef<typeof View>>> = forwardRef<ElementRef<typeof View>, ButtonProps>(function Button({
  children, prefixIcon, suffixIcon, block = false, intent = 'normal', variant = 'fill', size = 'base',
  disabled = false, loading = false, round = false, style, textStyle, className, textClassName,
  accessibilityState, onPressIn, onPressOut, ...props
}, ref) {
  const { mode, fontFamily } = useThemeContext();
  const [pressed, setPressed] = useState(false);
  const resolvedSize = useResponsiveSize(size);
  const blocked = disabled || loading;
  const options = { intent, variant, size: resolvedSize, disabled, loading, round, pressed: !blocked && pressed };
  const token = resolveButtonTokens(mode, options);
  return <VariableContextProvider value={getButtonVariables(mode, options)}>
    <StyledPressable
      {...props}
      ref={ref}
      className={twMerge(buttonClassName, block ? 'self-stretch' : 'self-start', className)}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      aria-disabled={blocked}
      aria-busy={loading}
      disabled={blocked}
      onPressIn={event => { setPressed(true); onPressIn?.(event); }}
      onPressOut={event => { setPressed(false); onPressOut?.(event); }}
      style={style}
    >
      {loading ? <Loading size={token['icon-size']} fillColor={token.color} aria-hidden /> : prefixIcon}
      {children != null && <StyledText className={twMerge(labelClassName, textClassName)} style={[fontFamily ? { fontFamily } : undefined, textStyle]}>{children}</StyledText>}
      {suffixIcon}
    </StyledPressable>
  </VariableContextProvider>;
});
