import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { installerServiceFactory } from './installer';
import type { InstallerService } from './installer';
import type { IBKDomService } from './dom.service';
import type { IDomEngineProps, IDomRenderProps, IRenderNodeInput, IRenderNodeOverrides, IRenderer, IRendererPack } from './type';

export type { IDomEngineProps, IDomRenderProps } from './type';

export const DomEngineContext = createContext<{ installerService: InstallerService; installerVersion: number } | null>(null);

const EMPTY_PACKS: IRendererPack[] = [];

// 顶层和递归入口均已处理默认回调，matcher 与 renderer 接收同一 onChange。
type DomRenderProps = IDomRenderProps & {
  onChange: NonNullable<IDomRenderProps['onChange']>;
};

// 唯一 uid 保持节点身份；重复 uid 增加出现次数，避免同层 key 冲突。
const createNodeKeys = (doms: IRenderNodeInput[]) => {
  const occurrences = new Map<string, number>();
  return doms.map((dom, index) => {
    if (!dom || Array.isArray(dom) || !dom.uid) return `index:${index}`;
    const count = occurrences.get(dom.uid) ?? 0;
    occurrences.set(dom.uid, count + 1);
    return `uid:${JSON.stringify([dom.uid, count])}`;
  });
};

// useContext 订阅整个 value：版本变化即重新匹配，即便 service 引用未变。
export function useInstallerService() {
  const context = useContext(DomEngineContext);
  if (!context) throw new Error('useInstallerService must be used within <DomEngine />');
  return context.installerService;
}

const DomRender = memo(function DomRender(props: DomRenderProps): React.JSX.Element | null {
  const installerService = useInstallerService();
  const definition = installerService.get(props.dom?.tagName, props);
  if (!definition) return null;
  return <RendererHost {...props} Renderer={definition.render} />;
});

// 注册表更新让 DomRender 重新匹配；组件与参数未变时无需重新调用 renderer。
// renderer 自身的 state / update$ 更新不会重渲染此父组件，renderNode 因此保持不变。
// 真实的继承参数变化需更新闭包，使依赖 renderNode 的 memo 子组件也能接收新值。
const RendererHost = memo(function RendererHost({ Renderer, ...props }: DomRenderProps & { Renderer: IRenderer }) {
  const { dom, I18n, service, onChange, ...rest } = props;

  const renderNode = useCallback(function renderNode(
    nextDom: IRenderNodeInput,
    overrides: IRenderNodeOverrides = {},
  ): React.ReactNode {
    if (!nextDom) return null;
    if (Array.isArray(nextDom)) {
      const keys = createNodeKeys(nextDom);
      return nextDom.map((item, index) => (
        <React.Fragment key={keys[index]}>{renderNode(item, overrides)}</React.Fragment>
      ));
    }
    return (
      <DomRender
        {...props}
        {...overrides}
        dom={nextDom}
        I18n={overrides.I18n ?? props.I18n}
        service={overrides.service ?? props.service}
        onChange={overrides.onChange ?? props.onChange}
      />
    );
  }, [props]);

  return <Renderer {...rest} dom={dom} I18n={I18n} service={service} onChange={onChange} renderNode={renderNode} />;
});

export const DomEngine = ({
  i18nModules,
  service,
  children,
  packs = EMPTY_PACKS,
  renderDom,
  onChange,
  I18n,
  ...rest
}: IDomEngineProps) => {
  // StrictMode 可能调用初始化函数两次，工厂必须无外部副作用。
  const [installerService] = useState(installerServiceFactory);
  // 一棵引擎树仅订阅一次注册表；Context 版本变化使 memo 节点重新匹配。
  const installerVersion = useSyncExternalStore(
    installerService.subscribe, installerService.getSnapshot, installerService.getSnapshot,
  );
  const contextValue = useMemo(() => ({ installerService, installerVersion }), [installerService, installerVersion]);
  const [snapshot, setSnapshot] = useState<{ service: typeof service; doms: IBKDomService[] }>(
    () => ({ service, doms: [] }),
  );
  const { doms, service: renderedService } = snapshot;

  useEffect(() => {
    // 新流未发射前保留上一批节点及其所属 service，避免空态和错写新服务。
    const subscription = service.doms$.subscribe(doms => setSnapshot({ service, doms }));
    return () => subscription.unsubscribe();
  }, [service]);

  useEffect(() => {
    installerService.installMany(packs);
  }, [installerService, packs]);

  const defaultChange = useCallback((key: string, value: any, property = 'value') => {
    renderedService.set(key, value, property);
  }, [renderedService]);
  const change = onChange ?? defaultChange;
  const keys = useMemo(() => createNodeKeys(doms), [doms]);

  return (
    <DomEngineContext.Provider value={contextValue}>
      {children}
      {doms.map((dom, index) => {
        const node = <DomRender {...rest} dom={dom} I18n={I18n} service={renderedService} onChange={change} />;
        return <React.Fragment key={keys[index]}>{renderDom ? renderDom({ dom, node, index }) : node}</React.Fragment>;
      })}
    </DomEngineContext.Provider>
  );
};

/**
 * 订阅当前 DomEngine 注册表，返回单调递增的版本号。
 * 新增 pack 或清空非空注册表时触发更新；重复安装和清空空表不改变版本。
 * 版本可用作依赖项，使基于注册表的派生数据重新计算。须在 DomEngine 内调用。
 */
export function useInstallerVersion(): number {
  const installer = useInstallerService();
  return useSyncExternalStore(
    installer.subscribe,
    installer.getSnapshot,
    installer.getSnapshot,
  );
}

/**
 * 返回当前 DomEngine 已注册的 tagName 列表，去重并按首次注册顺序排列。
 * 列表不按 targetType / match 过滤，不代表每个标签都能命中当前业务参数。
 * 注册表版本变化时重新计算，否则复用数组引用；须在 DomEngine 内调用。
 */
export function useSupportedTagNames(): string[] {
  const installer = useInstallerService();
  const version = useInstallerVersion();
  return useMemo(() => installer.getTagNames(), [installer, version]);
}
