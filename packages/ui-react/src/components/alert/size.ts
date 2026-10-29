import type { CSSProperties } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';
import { mapResponsiveSize } from '../utils/size';

const dimensions = [
  'padding-x',
  'padding-y',
  'font-size',
  'line-height',
  'gap',
  'icon-size',
] as const;

type AlertSizeStyle = CSSProperties & { [key: `--alert-${string}`]: string };

/** 只设置 Alert 自己的 token 引用；媒体查询在 CSS 中处理，无需监听窗口。 */
export function getAlertSizeStyle(size: IBKSize | IBKResponsiveSize): AlertSizeStyle {
  const style: AlertSizeStyle = {};

  const setSize = (scope: string, value: IBKSize) => {
    for (const dimension of dimensions) {
      style[`--alert-${scope}-${dimension}`] = `var(--alert-size-${value}-${dimension})`;
    }
  };

  mapResponsiveSize(size, setSize);

  return style;
}
