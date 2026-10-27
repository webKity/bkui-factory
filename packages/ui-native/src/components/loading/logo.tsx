import Svg, { Path } from 'react-native-svg';
import { LOGO_PATHS } from '@bkreact/assets/logo';
export function LogoLoading({ width, height, color }: { width: number; height: number; color: string }) {
  return <Svg width={width} height={height} viewBox="0 360 1024 300" fill={color} aria-hidden>
    {LOGO_PATHS.map((d, index) => <Path key={index} d={d} />)}
  </Svg>;
}
