/** 渲染器管理服务。按 pack 层级、安装顺序决定覆盖优先级。 */
import { BehaviorSubject } from 'rxjs';

import type {
  IMatcherProps,
  IRendererDefinition,
  IRendererLayer,
  IRendererPack,
  IRendererPackMeta,
  IRendererRegistry,
} from './type';

const layerWeight: Record<IRendererLayer, number> = { core: 1, domain: 2, type: 3, custom: 4 };

type Candidate = { definition: IRendererDefinition; weight: number };

export class InstallerService implements IRendererRegistry {
  private active = new Map<string, Candidate[]>();
  private installed = new Set<IRendererPack>();
  private version = 0;
  private _packs$ = new BehaviorSubject<readonly IRendererPack[]>([]);

  install(pack: IRendererPack) {
    this.installMany([pack]);
  }

  // 仅追加安装（append-only），按引用去重；清空已有定义请调用 clear()。
  // 同名的不同 pack 仍可按安装顺序覆盖。
  installMany(packs: readonly IRendererPack[]) {
    const pending = [...new Set(packs)].filter(pack => !this.installed.has(pack));
    // 防御运行时绕过 TypeScript 的非法输入；先验证整批，再准备和提交。
    // 空 renderers 合法：保留 pack 元数据，但不会产生候选定义。
    for (const pack of pending) {
      if (!pack || !Array.isArray(pack.renderers) || !Object.hasOwn(layerWeight, pack.layer)) {
        throw new TypeError('Invalid renderer pack: expected renderers and a valid layer');
      }
      for (const renderer of pack.renderers) {
        if (!renderer || typeof renderer.tagName !== 'string' || !renderer.tagName.trim()) {
          throw new TypeError('Renderer tagName must be a non-empty string');
        }
      }
    }
    if (!pending.length) return;

    const prepared = pending.map(pack => ({
      pack,
      weight: layerWeight[pack.layer],
      definitions: pack.renderers.map((renderer): IRendererDefinition => {
        const rendererMatcher = renderer.match;
        const targetType = pack.targetType;
        return {
          ...renderer,
          layer: renderer.layer ?? pack.layer,
          match: targetType
            ? props => props.service.targetType === targetType && (!rendererMatcher || rendererMatcher(props))
            : rendererMatcher,
        };
      }),
    }));

    // getter / 展开等构造过程可能抛错，全部准备完成后才修改注册表。
    for (const { pack, weight, definitions } of prepared) {
      for (const definition of definitions) {
        const candidates = this.active.get(definition.tagName) ?? [];
        const index = candidates.findIndex(candidate => candidate.weight > weight);
        candidates.splice(index < 0 ? candidates.length : index, 0, { definition, weight });
        this.active.set(definition.tagName, candidates);
      }
      this.installed.add(pack);
    }

    // 注册表更新完成之后才发布，订阅者可立即查询到最新 renderer。
    this.version += 1;
    this._packs$.next([...this.packs, ...pending]);
  }

  // 释放所有 pack 和候选定义；订阅者保留，可在清空后继续安装。
  clear() {
    if (!this.installed.size) return;
    this.active.clear();
    this.installed.clear();
    this.version += 1;
    this._packs$.next([]);
  }

  get(tagName?: string | null, props?: IMatcherProps) {
    if (!tagName) return undefined;
    const candidates = this.active.get(tagName) ?? [];
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const { definition } = candidates[i];
      if (!definition.match || (props && definition.match(props))) return definition;
    }
    return undefined;
  }

  has(tagName?: string | null) {
    return !!tagName && !!this.active.get(tagName)?.length;
  }

  get packs() {
    return this._packs$.getValue();
  }

  get packs$() {
    return this._packs$.asObservable();
  }

  // 稳定的快照和订阅函数供 React useSyncExternalStore 使用。
  getSnapshot = () => this.version;

  subscribe = (listener: () => void) => {
    const subscription = this._packs$.subscribe(listener);
    return () => subscription.unsubscribe();
  };

  list() {
    return Array.from(this.active.values()).flatMap(candidates => candidates.map(({ definition }) => definition));
  }

  listPacks(): IRendererPackMeta[] {
    return this.packs.map(({ renderers: _renderers, ...meta }) => meta);
  }
}

export const installerServiceFactory = () => new InstallerService();
