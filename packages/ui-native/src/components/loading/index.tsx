import { twMerge } from 'tailwind-merge';
import { forwardRef, useEffect, useRef } from 'react';
import type { ElementRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { Animated, Easing, View } from 'react-native';
import { VariableContextProvider } from 'nativewind';
import { useThemeContext } from '../themes';
import { createTokens } from './design.tokens';
import { StyledView } from '../utils/styled';
import { useResponsiveSize } from '../utils/size';
import { useReducedMotion } from '../utils/motion';
import { BKIcon } from '../icon';
import { LogoLoading } from './logo';

import type { LoadingProps } from './type';
export type { LoadingProps, LoadingType, LoadingSize } from './type';

const loadingClassName = 'flex-row items-center justify-center shrink-0 w-[var(--bk-loading-width)] h-[var(--bk-loading-size)]';

export const Loading: ForwardRefExoticComponent<LoadingProps & RefAttributes<ElementRef<typeof View>>> = forwardRef<ElementRef<typeof View>, LoadingProps>(function Loading({
  type = 'normal', size = 'base', fillColor, speed, ariaLabel, accessibilityLabel, className, style, 'aria-hidden': hidden, ...props
}, ref) {
  const { theme } = useThemeContext();
  const shared = createTokens(theme);
  const resolvedSize = useResponsiveSize(typeof size === 'number' ? 'base' : size);
  if (typeof size === 'number' && (!Number.isFinite(size) || size < 0)) throw new Error(`Loading.size：尺寸必须为非负有限数值，收到 ${size}`);
  const height = typeof size === 'number' ? size : shared.sizes[resolvedSize];
  const width = height * (type === 'logo' ? shared.base['logo-aspect-ratio'] : 1);
  const color = fillColor ?? shared.base.color;
  const duration = speed !== undefined && Number.isFinite(speed) && speed > 0 ? speed
    : shared.base[type === 'rect' ? 'rect-duration-ms' : type === 'logo' ? 'logo-duration-ms' : 'normal-duration-ms'];
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const bars = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.35))).current;
  useEffect(() => {
    progress.setValue(reduced ? 1 : 0);
    for (const bar of bars) bar.setValue(reduced ? 1 : 0.35);
    if (reduced) return;
    const animation = type === 'rect' ? Animated.parallel(bars.map((bar, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * duration / 10),
      Animated.timing(bar, { toValue: 1, duration: duration / 5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(bar, { toValue: 0.35, duration: duration / 5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.delay(duration * (0.6 - index / 10)),
    ])))) : Animated.loop(Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: type === 'normal' }));
    animation.start();
    return () => animation.stop();
  }, [reduced, type, duration, progress, bars]);
  return <VariableContextProvider value={{ '--bk-loading-width': `${width}px`, '--bk-loading-size': `${height}px` }}>
    <StyledView
      {...props} ref={ref}
      className={twMerge(loadingClassName, className)} style={style}
      accessible={!hidden} accessibilityRole={hidden ? undefined : 'progressbar'}
      accessibilityLabel={hidden ? undefined : ariaLabel ?? accessibilityLabel ?? '加载中'}
      aria-hidden={hidden} accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    >
      {type === 'normal' ? <Animated.View style={{ transform: [{ rotate: reduced ? '0deg' : progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <BKIcon name="loader" size={height} color={color} />
      </Animated.View> : type === 'rect' ? <StyledView className="flex-row items-center justify-center w-full h-full" style={{ gap: height * 0.08 }}>
        {bars.map((bar, index) => <Animated.View key={index} style={{ width: height * 0.12, height, borderRadius: shared.base['bar-radius'], backgroundColor: color, transform: [{ scaleY: bar }] }} />)}
      </StyledView> : <View style={{ width, height }}>
        <View style={{ opacity: shared.base['logo-muted-opacity'] }}><LogoLoading width={width} height={height} color={color} /></View>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', height,
          width: reduced ? width : progress.interpolate({ inputRange: [0, 0.7229, 1], outputRange: [0, width, width] }),
          opacity: reduced ? 1 : progress.interpolate({ inputRange: [0, 0.9337, 1], outputRange: [1, 1, 0] }),
        }}><LogoLoading width={width} height={height} color={color} /></Animated.View>
      </View>}
    </StyledView>
  </VariableContextProvider>;
});
export default Loading;
