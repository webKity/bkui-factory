import { useEffect, useMemo, useReducer, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BehaviorSubject } from 'rxjs';
import { DomEngine } from './dom.engine';
import { BKDomService } from '../service/dom.service';
import type { IBKDomService } from '../service/dom.service';
import type { IDomEngineProps, IDomEngineService, IRendererPack, IRendererProps } from './type';
import { Button } from '../button';
import { Input } from '../input';

// 引擎管理列表与 renderer 选择；节点数据的订阅由 renderer 负责。
function useNodeUpdates(dom: IBKDomService) {
  const [, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    const subscription = dom.update$.subscribe(() => refresh());
    return () => subscription.unsubscribe();
  }, [dom]);
}

function TextRenderer({ dom }: IRendererProps) {
  useNodeUpdates(dom);
  return <p>{dom.getData('label')}</p>;
}

function FieldRenderer({ dom, onChange }: IRendererProps) {
  useNodeUpdates(dom);
  return (
    <label className="example-stack">
      <span>{dom.getData('label')}</span>
      <Input
        aria-label={dom.getData('label')}
        value={dom.getData('value') ?? ''}
        onChange={event => onChange?.(dom.uid, event.target.value)}
      />
      <small>当前值：{dom.getData('value') || '未填写'}</small>
    </label>
  );
}

function GroupRenderer({ dom, renderNode }: IRendererProps) {
  useNodeUpdates(dom);
  return (
    <fieldset className="example-stack">
      <legend>{dom.getData('label')}</legend>
      {renderNode(dom.getData('children'))}
    </fieldset>
  );
}

const corePack: IRendererPack = {
  name: 'demo-core',
  layer: 'core',
  renderers: [
    { tagName: 'text', render: TextRenderer },
    { tagName: 'field', render: FieldRenderer },
    { tagName: 'group', render: GroupRenderer },
  ],
};

const gridPack: IRendererPack = {
  name: 'demo-grid',
  layer: 'type',
  targetType: 'grid',
  renderers: [{
    tagName: 'text',
    match: ({ dom }) => dom.uid === 'intro',
    render: () => <p>网格专用渲染器：仅匹配 targetType=grid 且 uid=intro 的节点。</p>,
  }],
};

const customPack: IRendererPack = {
  name: 'demo-custom',
  layer: 'custom',
  renderers: [{
    tagName: 'text',
    render: () => <p>已安装 custom 层：同一节点列表现在使用优先级更高的渲染器。</p>,
  }],
};

const corePacks = [corePack];
const matchingPacks = [corePack, gridPack];

function createDemoService(doms: IBKDomService[], targetType = 'default'): IDomEngineService {
  const doms$ = new BehaviorSubject(doms);
  function find(uid: string, nodes = doms$.value): IBKDomService | undefined {
    for (const dom of nodes) {
      if (dom.uid === uid) return dom;
      const nested = dom.getData('children') as IBKDomService[] | undefined;
      const match = nested && find(uid, nested);
      if (match) return match;
    }
    return undefined;
  }
  return {
    doms$,
    targetType,
    get: key => find(key),
    set: (key, value, property = 'value') => find(key)?.setData(property, value),
  };
}

const createIntro = () => new BKDomService('intro', 'text', { label: '基础渲染器：由 tagName=text 选择。' });

// 每次挂载独立创建服务，避免不同 story 或 Docs 示例共享可变节点。
function BasicExample(args: IDomEngineProps) {
  const [service] = useState(() => createDemoService([createIntro()]));
  return <DomEngine {...args} service={service} />;
}

const meta = {
  title: '组件/DomEngine',
  component: DomEngine,
  tags: ['autodocs'],
  args: { service: createDemoService([]), i18nModules: [], I18n: {}, packs: corePacks },
  argTypes: {
    service: { control: false, description: '提供 doms$、set、get，可提供 targetType。示例内部创建独立服务。' },
    packs: { control: false, description: '按对象引用去重，追加安装；移除数组元素不会卸载 pack。' },
    I18n: { control: 'object', description: '透传给匹配器和 renderer。' },
    i18nModules: { control: false, description: '当前类型要求传入，尚未实现自动加载，可传 []。' },
    onChange: { control: false, description: '省略时调用 service.set(key, value, property)，property 默认为 value。' },
    renderDom: { control: false, description: '包装顶层节点，接收 { dom, node, index }。' },
  },
  render: args => <BasicExample {...args} />,
  parameters: {
    docs: {
      description: {
        component: [
          '订阅 service.doms$，根据 tagName 和 match 选择 renderer，通过 renderer 的 renderNode 递归渲染子节点。当前使用源码路径 ./dom.engine、./type，尚未从包入口导出。',
          '优先级为 core < domain < type < custom，排序依据为 pack.layer；同层后装优先，同 pack 后声明优先。targetType 与 renderer.match 必须同时满足；匹配器不接收 renderNode。未命中的节点渲染 null。',
          '每个引擎拥有独立注册表。安装后会通知渲染层，不要求 doms$ 再次发射。pack 按引用去重，建议在组件外声明或 useMemo；同名不同对象仍会追加安装。当前不支持单个卸载；可用 installerService.clear() 释放所有已安装 pack，再显式安装所需 pack，也可更换引擎 key 重新挂载。',
          '引擎订阅节点列表，renderer 自行订阅 dom.update$ 以展示节点内部数据更新。更换 service 引用或卸载时会取消旧列表订阅。切换异步服务时保留上一批节点及其原 service，直到新流发射（发射 [] 可主动清空）。引擎统一订阅一次注册表，通过版本 Context 通知节点重新匹配；匹配组件和参数未变时，独立 memo 边界跳过 renderer 调用。订阅及安装在 effect 中执行，客户端首帧和 SSR 均不输出节点列表。',
          'renderNode 支持单节点、数组和空值；第二个参数覆盖继承的 I18n、service、onChange 及扩展参数，不能覆盖 dom 或 renderNode。三个显式参数使用 ?? 继承父值，null 和 undefined 都表示继承，不能用于清空。传入的扩展对象或回调应尽量保持引用稳定，以便 memo 跳过不必要的递归渲染。节点应提供同层唯一且稳定的 uid；重复 uid 的 key 虽有兜底，重排仍可能影响组件状态。',
          'InstallerService 提供 install、installMany、get、has、list()、listPacks()、clear()、packs 和 packs$；getSnapshot() 返回单调递增的版本号，clear() 也会通知引擎更新。无匹配参数调用 get 时跳过条件 renderer；has 仅检查是否注册。list() 返回候选定义，不记录匹配历史。新增 pack 在发布前完成整批校验、定义构造和注册；空 renderers 合法，仅登记 pack 元数据。子组件可用 useInstallerService() 获取当前注册表，须位于 DomEngine 内。',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta<typeof DomEngine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '基础渲染' };

export const Recursive: Story = {
  name: '递归表单与数据更新',
  parameters: { docs: { description: { story: 'group renderer 调用 renderNode 渲染子节点。输入变更走默认 service.set，field renderer 订阅 update$ 更新显示。' } } },
  render: function RecursiveExample(args) {
    const [service] = useState(() => createDemoService([
      new BKDomService('profile', 'group', {
        label: '个人资料',
        children: [
          new BKDomService('name', 'field', { label: '昵称', value: 'Bitkan' }),
          new BKDomService('email', 'field', { label: '邮箱', value: '' }),
        ],
      }),
    ]));
    return <DomEngine {...args} service={service} />;
  },
};

export const Matching: Story = {
  name: '层级覆盖与条件匹配',
  parameters: { docs: { description: { story: '切换业务类型观察 intro 节点匹配结果；第二个 text 节点不满足 uid 条件，始终回退到 core renderer。' } } },
  render: function MatchingExample(args) {
    const [targetType, setTargetType] = useState('default');
    const service = useMemo(() => createDemoService([
      createIntro(),
      new BKDomService('other', 'text', { label: '其他节点：继续使用基础渲染器。' }),
    ], targetType), [targetType]);
    return (
      <div className="example-stack">
        <div className="example-row">
          <Button onClick={() => setTargetType('default')}>普通业务</Button>
          <Button onClick={() => setTargetType('grid')}>网格业务</Button>
        </div>
        <p>当前 targetType：{targetType}</p>
        <DomEngine {...args} service={service} packs={matchingPacks} />
      </div>
    );
  },
};

export const DynamicInstallation: Story = {
  name: '动态安装与重置',
  parameters: { docs: { description: { story: '节点流无需再次发射，追加 custom pack 即可更新匹配。重置通过更换 key 创建新引擎。' } } },
  render: function DynamicExample(args) {
    const [service] = useState(() => createDemoService([createIntro()]));
    const [installed, setInstalled] = useState(false);
    const [generation, setGeneration] = useState(0);
    const packs = useMemo(() => installed ? [corePack, customPack] : corePacks, [installed]);
    return (
      <div className="example-stack">
        <div className="example-row">
          <Button disabled={installed} onClick={() => setInstalled(true)}>安装 custom pack</Button>
          <Button onClick={() => { setInstalled(false); setGeneration(value => value + 1); }}>重置引擎</Button>
        </div>
        <DomEngine {...args} key={generation} service={service} packs={packs} />
      </div>
    );
  },
};

export const WrappedNodes: Story = {
  name: '自定义顶层包装',
  parameters: { docs: { description: { story: 'renderDom 包装顶层节点，可用于添加序号或布局；children 在节点列表之前渲染。' } } },
  render: function WrappedExample(args) {
    const [service] = useState(() => createDemoService([
      createIntro(),
      new BKDomService('details', 'text', { label: '由业务服务提供的第二个节点。' }),
    ]));
    return (
      <DomEngine
        {...args}
        service={service}
        renderDom={({ node, index }) => <div className="example-row"><strong>{index + 1}.</strong>{node}</div>}
      >
        <h3>节点列表</h3>
      </DomEngine>
    );
  },
};
