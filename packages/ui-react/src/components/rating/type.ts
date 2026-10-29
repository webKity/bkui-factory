import type { HTMLAttributes } from 'react';
import type { IBKResponsiveSize, IBKSize } from '../types/base';

export type RatingTrigger = 'hover' | 'click';

export interface RatingProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'style' | 'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'defaultValue'
> {
  /** 受控评分；整数，0 表示尚未评分。 */
  value?: number;
  /** 非受控初始评分，默认 0；评分会取整并限制在 0 到 count 之间。 */
  defaultValue?: number;
  /** 星星数量，默认 5；非正安全整数回退为 5。 */
  count?: number;
  /** 默认 click：悬停仅预览，点击提交；hover 移入即提交，不同分值逐次通知，连续相同分值去重。 */
  trigger?: RatingTrigger;
  disabled?: boolean;
  /** 仅展示分数，不进入 Tab 顺序。 */
  readOnly?: boolean;
  size?: IBKSize | IBKResponsiveSize;
  /** 表单字段名；未传时每个实例独立成组，未选择时不提交该字段。 */
  name?: string;
  onChange?: (value: number) => void;
  /** 根据当前分值生成整体可访问名称，适用于交互和只读模式；aria-label 优先。 */
  getAriaLabel?: (value: number, total: number) => string;
  /** 自定义每个选项的可访问名称，默认“X 分”；只读模式无选项，不调用此函数。 */
  getItemAriaLabel?: (value: number) => string;
}
