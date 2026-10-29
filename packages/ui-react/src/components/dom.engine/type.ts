

import type { Observable } from 'rxjs';
import type { IBKDomService } from '../service/dom.service';
import type { ComponentType, ReactNode } from 'react';

// 基础dom相关类型
export interface IDomEngineService {
  // 用来匹配渲染特定业务的组件的target
  targetType?: string;

  doms$: Observable<IBKDomService[]>;

  set: (key: any, value: any, property?: string) => void;
  get: (key: any) => IBKDomService | undefined | null;
}

export interface IDomEngineRenderHooks {
  onChange?: (key: string, value: any, property?: string) => void;
  onClose?: () => void;
  onLock?: (val: boolean) => void;
  [key: string]: any;
}

export interface IDomEngineProps {
  i18nModules: string | string[];
  service: IDomEngineService;
  children?: any;
  packs?: IRendererPack[];
  onChange?: (key: string, value: any, property?: string) => void;
  renderDom?: (params: { dom: IBKDomService; node: ReactNode; index: number }) => ReactNode;
  onClose?: () => void;
  onLock?: (val: boolean) => void;
  [key: string]: any;
}

export interface IDomRenderProps extends IDomEngineRenderHooks {
  dom: IBKDomService;
  I18n: any;
  service: IDomEngineService;
}

/**
 * core: 核心基础；
 * domain： 业务领域（如：策略模块、账号模块）
 * type： 某个业务下的具体业务（如：无限网格）
 * custom： 任意自定义定制化的场景
 */
export type IRendererLayer = 'core' | 'domain' | 'type' | 'custom';

export interface IRendererPackMeta {
  name: string;
  layer: IRendererLayer;
  targetDomain?: string;
  targetType?: string;
  description?: string;
}

export type IRenderer = ComponentType<IRendererProps>;

// 扩展 renderer 参数仍可传递，但 dom / renderNode 由递归入口管理。
export type IRenderNodeOverrides = Partial<IDomRenderProps> & {
  dom?: never;
  renderNode?: never;
};

export type IMatcherProps = IDomRenderProps;

export type IRenderNodeInput = IBKDomService | IBKDomService[] | null | undefined;

export interface IRendererDefinition {
  tagName: string;
  render: IRenderer;
  layer?: IRendererLayer;
  description?: string;
  match?: (props: IMatcherProps) => boolean;
}

export interface IRendererProps extends IDomRenderProps {
  renderNode: (dom: IRenderNodeInput, overrides?: IRenderNodeOverrides) => ReactNode;
}

export interface IRendererPack extends IRendererPackMeta {
  renderers: IRendererDefinition[];
}

export interface IRendererRegistry {
  clear: () => void;
  get: (tagName?: string | null, props?: IMatcherProps) => IRendererDefinition | undefined;
  has: (tagName?: string | null) => boolean;
  list: () => IRendererDefinition[];
  listPacks: () => IRendererPackMeta[];
}

