import { Platform } from 'react-native';
import { styled } from 'nativewind';
import Svg, { Path } from 'react-native-svg';
import { getIconDefinition } from '@bkreact/assets/icons';
import { useTheme } from '../themes';
import type { IconProps } from './type';
export type { IconProps } from './type';
export { iconNames, figmaIconNames } from '@bkreact/assets/icons';
export type { IconName, FigmaIconName, IconVariant } from '@bkreact/assets/icons';

const StyledSvg = styled(Svg, {
  className: { target: 'style', nativeStyleMapping: { width: true, height: true, color: true } },
});
export function BKIcon({ name, variant, size = 16, color, className, ariaLabel, accessibilityLabel, ...props }: IconProps) {
  const theme = useTheme();
  const icon = getIconDefinition(name, variant);
  if (!icon) return null;
  const label = ariaLabel ?? accessibilityLabel;
  const accessibility = Platform.OS === 'web'
    ? { role: label ? 'img' as const : undefined, 'aria-label': label, 'aria-hidden': props['aria-hidden'] ?? !label }
    : { accessible: !!label, accessibilityRole: label ? 'image' as const : undefined, accessibilityLabel: label, 'aria-hidden': props['aria-hidden'] ?? !label };
  return <StyledSvg
    {...props}
    className={className}
    width={size} height={size} viewBox={icon.viewBox} fill="none"
    color={color ?? theme.semantic['color-text-primary']}
    {...accessibility}
  >
    {icon.paths.map(({ fill, ...path }, index) => <Path key={index} {...path} fill={color && fill !== 'none' ? color : fill} />)}
  </StyledSvg>;
}
export default BKIcon;
