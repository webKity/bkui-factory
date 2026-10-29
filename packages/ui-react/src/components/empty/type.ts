import type { HTMLAttributes, ReactNode } from 'react';
import type { IBKBreakpoints, IBKResponsiveSize, IBKSize } from '../types/base';

/** data-size 及断点标记由 size 生成，不接受手动设置。 */
type EmptySizeAttributes = Partial<Record<'data-size' | `data-size-${IBKBreakpoints}`, never>>;

export interface EmptyProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'dangerouslySetInnerHTML'>,
    EmptySizeAttributes {
  /** 默认“暂无数据”；null、false、空字符串或纯空白文本隐藏描述。 */
  description?: ReactNode;
  /** 字符串作为图片 URL，其他节点原样展示；默认装饰图，null、false 或空白字符串隐藏。 */
  image?: ReactNode;
  /** 七档尺寸或响应式配置，默认 base。响应式必须提供 base；非法值会抛出带修复提示的错误。 */
  size?: IBKSize | IBKResponsiveSize;
  /** 描述下方的操作区；空字符串或纯空白文本不生成容器。 */
  children?: ReactNode;
}
