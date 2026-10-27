import type { SvgProps } from 'react-native-svg';
import type { IconName, IconVariant } from '@bkreact/assets/icons';
export interface IconProps extends Omit<SvgProps, 'children' | 'color' | 'width' | 'height' | 'viewBox'> {
  name: IconName;
  variant?: IconVariant;
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}
