import type { IBKSize, IBKResponsiveSize } from '../types/base';
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from 'react';

/** 在 Avatar 内返回单个 ReactElement；加载和错误回退由调用方处理。 */
export type IAttachmentRenderImage = (props: {
  img?: string;
  imgFallback?: string;
  title?: ReactNode;
  size: IBKSize | IBKResponsiveSize;
  round: boolean;
  imageProps: ComponentPropsWithoutRef<'img'>;
}) => ReactElement;

export type IAttachmentBaseProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children' | 'style'> & {
  /** 主图加载失败后的备用图片地址；主图或备用图地址变化都会重新尝试主图。 */
  imgFallback?: string;
  /** link 存在时，title 和 desc 不应包含链接、按钮等交互元素。 */
  title?: ReactNode;
  /** 图片及失败占位的可访问名称；默认使用字符串或数字标题，空字符串表示装饰图片。 */
  alt?: string;
  /** 默认 lazy，配合 AvatarImage.keepMounted；eager 使用预加载。 */
  loading?: ComponentPropsWithoutRef<'img'>['loading'];
  desc?: ReactNode;
  /** 独立操作区，不包含在 link 内。 */
  action?: ReactNode;
  /** 图片和文案区域的导航地址；空字符串按普通内容渲染。 */
  link?: string;
  /** 响应式对象必须提供 base；缺失或无效尺寸会在运行时抛错。 */
  size?: IBKSize | IBKResponsiveSize;
  round?: boolean;
  className?: string;
  imgClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  descClassName?: string;
};

export type IAttachmentProps = IAttachmentBaseProps & (
  | {
    img: string;
    renderImage?: IAttachmentRenderImage;
  }
  | {
    img?: string;
    renderImage: IAttachmentRenderImage;
  }
);
export type AttachmentProps = IAttachmentProps;
