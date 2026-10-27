import { twMerge } from 'tailwind-merge';
import { Children, cloneElement, forwardRef, isValidElement, useEffect, useRef, useState } from 'react';
import type { ElementRef, ForwardRefExoticComponent, ReactElement, ReactNode, RefAttributes } from 'react';
import { Animated, Easing, View } from 'react-native';
import { VariableContextProvider } from 'nativewind';
import { useThemeContext } from '../themes';
import { StyledPressable, StyledText, StyledView } from '../utils/styled';
import { useResponsiveSize } from '../utils/size';
import { useReducedMotion } from '../utils/motion';
import { BKIcon } from '../icon';
import type { IconProps } from '../icon';
import { getButtonVariables, resolveButtonTokens } from './tokens';
import type { ButtonProps } from './type';
export type { ButtonProps, ButtonShape, ButtonWidthMode } from './type';

// 静态工具类供 NativeWind V5 扫描；设计值全部来自组件自己的 tokens。
const buttonClassName = [
  'flex-row items-center justify-center',
  'min-h-[var(--bk-button-height)]',
  'px-[var(--bk-button-padding-x)] py-[var(--bk-button-padding-y)]',
  'rounded-[var(--bk-button-radius)] border-[length:var(--bk-button-border-width)]',
  'border-[color:var(--bk-button-border-color)] bg-[var(--bk-button-bg)] opacity-[var(--bk-button-opacity)]',
].join(' ');
const labelClassName = [
  'text-[color:var(--bk-button-color)] text-[length:var(--bk-button-font-size)]',
  'leading-[var(--bk-button-line-height)] font-[number:var(--bk-button-font-weight)]',
].join(' ');
const iconClassName = 'items-center justify-center shrink-0 w-[var(--bk-button-icon-size)] h-[var(--bk-button-icon-size)]';
type ButtonToken = ReturnType<typeof resolveButtonTokens>;

function iconContent(icon: ReactNode, token: ButtonToken) {
  // 与 Web 中继承 currentColor / 图标尺寸的行为一致，显式传入的值仍优先。
  if (isValidElement<IconProps>(icon) && icon.type === BKIcon) {
    return cloneElement(icon as ReactElement<IconProps>, { size: icon.props.size ?? token['icon-size'], color: icon.props.color ?? token.color });
  }
  return icon;
}

function ButtonSpinner({ token, reduced }: { token: ButtonToken; reduced: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(Animated.timing(progress, { toValue: 1, duration: token.spinnerDuration, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [reduced, token.spinnerDuration, progress]);
  return <Animated.View testID="bk-button-spinner" style={{
    width: token['icon-size'], height: token['icon-size'], borderRadius: token['icon-size'] / 2,
    borderWidth: token.spinnerBorderWidth, borderColor: 'transparent', borderRightColor: token.color,
    transform: [{ rotate: reduced ? '0deg' : progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
  }} />;
}

export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<ElementRef<typeof View>>> = forwardRef<ElementRef<typeof View>, ButtonProps>(function Button({
  children, prefixIcon, suffixIcon, block = false, intent = 'normal', variant = 'fill', size = 'base',
  shape = 'rect', widthMode = 'auto', disabled = false, loading = false, round = false,
  style, textStyle, className, textClassName, accessibilityState,
  onPressIn, onPressOut, onHoverIn, onHoverOut, ...props
}, ref) {
  const { theme, fontFamily } = useThemeContext();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const resolvedSize = useResponsiveSize(size);
  const reduced = useReducedMotion();
  const blocked = disabled || loading;
  const options = { intent, variant, size: resolvedSize, shape, widthMode, block, disabled, loading, round, pressed, hovered };
  const token = resolveButtonTokens(theme, options);
  const constrained = token.shape === 'square' || token.widthMode === 'fixed';
  const hasLabel = Children.toArray(children).length > 0;
  const hasLeading = loading || prefixIcon != null;
  const leading = useRef(new Animated.Value(hasLeading ? 1 : 0)).current;
  useEffect(() => {
    if (blocked) setPressed(false);
  }, [blocked]);
  useEffect(() => {
    if (reduced) { leading.setValue(hasLeading ? 1 : 0); return; }
    const animation = Animated.timing(leading, { toValue: hasLeading ? 1 : 0, duration: token.loadingDuration, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [hasLeading, reduced, token.loadingDuration, leading]);

  if (process.env.NODE_ENV !== 'production') {
    if (block && shape !== 'rect') console.warn(`[Button] shape="${shape}" 与 block 冲突，block 场景下 shape 会被降级为 "rect"。`);
    if (block && widthMode === 'fixed') console.warn('[Button] widthMode="fixed" 与 block 冲突，block 场景下 widthMode 会被降级为 "auto"。');
    if (shape === 'square' && widthMode === 'fixed' && !block) console.warn('[Button] widthMode="fixed" 与 shape="square" 冲突，shape 优先，widthMode 会被降级为 "auto"。');
  }

  return <VariableContextProvider value={getButtonVariables(token)}>
    <StyledPressable
      {...props} ref={ref}
      className={twMerge(buttonClassName,
        block ? 'w-full self-stretch' : 'self-start',
        constrained ? 'w-[var(--bk-button-width)] shrink-0' : undefined,
        token.shape === 'square' ? 'h-[var(--bk-button-height)]' : undefined, className)}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      aria-disabled={blocked} aria-busy={loading} disabled={blocked}
      onPressIn={event => { if (!blocked) { setPressed(true); onPressIn?.(event); } }}
      onPressOut={event => { setPressed(false); onPressOut?.(event); }}
      onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
      onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
      style={style}
    >
      <StyledView className="flex-row items-center justify-center min-w-0 max-w-full gap-[var(--bk-button-content-gap)]">
        <Animated.View testID="bk-button-leading" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{
          flexShrink: 0, overflow: 'hidden', opacity: leading,
          width: leading.interpolate({ inputRange: [0, 1], outputRange: [0, token['icon-size']] }),
          marginEnd: leading.interpolate({ inputRange: [0, 1], outputRange: [0, hasLabel || suffixIcon != null ? token.gap : 0] }),
        }}>
          <StyledView className={iconClassName}>
            {loading ? <ButtonSpinner token={token} reduced={reduced} /> : iconContent(prefixIcon, token)}
          </StyledView>
        </Animated.View>
        {hasLabel && <StyledText numberOfLines={1} ellipsizeMode="tail"
          className={twMerge(labelClassName, constrained || block ? 'min-w-0 shrink' : 'shrink-0', textClassName)}
          style={[fontFamily ? { fontFamily } : undefined, textStyle]}>{children}</StyledText>}
        {suffixIcon != null && <StyledView testID="bk-button-suffix" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          className={twMerge(iconClassName, hasLabel ? 'ms-[var(--bk-button-gap)]' : undefined)}>{iconContent(suffixIcon, token)}</StyledView>}
      </StyledView>
    </StyledPressable>
  </VariableContextProvider>;
});
