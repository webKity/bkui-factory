# bkui-factory

`bkui-factory` 是基于共享 Figma tokens 的 React / React Native 组件库工作区。`@bkreact/ui` 保留现有 Web API，`@bkreact/ui-native` 基于 NativeWind V5 提供 RN Button、Icon、Loading、ThemeProvider 和 useTheme；`@bkreact/assets` 提供共用的图标与 Logo 路径。Tokens 从设计源直接编译进平台组件源码。

Figma 原始基础变量保留在 `source/`。Button 与 Loading 的设计映射和尺寸补充在 `source/components/*.tokens.json`；这部分由原有 CSS 提取，不表示已从 Figma 自动同步组件定义。编译器将同一份输入解析成带类型和引用的模型，再生成 Web CSS 和 RN 数值主题。脚本不连接 Figma。

## 目录与职责

```text
source/                               # Figma 与共享组件设计输入
├── primitives/
├── semantic/
├── components/*.tokens.json          # 每个组件的设计定义
├── icons/                            # Figma 图标导出
└── themes.config.json
scripts/
├── generate-theme-tokens.mjs         # 编译命令入口
└── tokens/
    ├── source.mjs                    # 读取、规范化、引用与类型校验
    └── build.mjs                     # 两端输出、写入及一致性校验
packages/
├── assets/                           # 共用图标与 Logo 路径
├── ui-react/src/components/
│   ├── themes/                       # 基础色、语义色、字体和圆角 CSS
│   ├── button/
│   │   ├── design.tokens.css         # 自动生成的 Button 设计值
│   │   └── tokens.css                # Button 的 Web 状态与布局映射
│   └── loading/                      # 同样在组件内部维护 tokens
└── ui-native/src/components/
    ├── themes/
    │   ├── tokens.ts                 # 自动生成的基础主题及语义变量
    │   ├── tokens.css                # 自动生成的 NativeWind 语义映射
    │   └── index.tsx                 # ThemeProvider、useTheme
    ├── button/
    │   ├── design.tokens.ts          # 自动生成的 Button 各主题设计值
    │   ├── tokens.ts                 # 状态计算与 NativeWind 组件变量
    │   ├── type.ts                   # 组件 API
    │   └── index.tsx                 # 组件渲染与静态工具类
    └── loading/                      # 独立的 design.tokens.ts 与实现
apps/
├── storybook-web/.storybook/
└── storybook-native-web/.storybook/
```

全局主题只包含 primitive 与 semantic。Button、Loading 的设计值留在各自组件目录，由组件自行选择主题、计算状态并注入局部变量。修改设计值从 `source/` 开始，运行 `npm run tokens:build` 后直接更新平台源码；带生成标记的文件不手工修改。维护组件时，直接查看它的设计 tokens、平台映射和渲染实现即可。

当前导出文件中的首尾空格可以保留，脚本会在生成路径和变量名称时去掉首尾空格。它读取本地 JSON，不连接 Figma，也不负责从 Figma 下载数据。

## 架构与数据流

```text
Figma 基础变量 + 共享组件设计定义
                ↓
       类型与引用模型（每主题）
           ↙             ↘
主题 / 组件 CSS       主题 / 组件 TypeScript
      ↓                     ↓
 React DOM 组件       RN Pressable / Text
```

### 1. 设计数据层：source

脚本支持以下输入约定。表中的输出为 Web 主题路径；RN 的基础与语义数据合并在 `components/themes/tokens.ts`：

| 输入路径 | 含义 | 输出 |
| --- | --- | --- |
| `primitives/<theme>/<name>.tokens.json` | 主题基础颜色，变量类型必须为 `color` | `<theme>/primitive/<name>.css` |
| `semantic/<theme>/<name>.tokens.json` | 主题语义颜色，保留到 primitive 的引用 | `<theme>/semantic/<name>.css` |
| `semantic/English.tokens.json`、`中文.tokens.json`、`Numeric.tokens.json` | 各主题共用的字体和排版默认值 | 各主题的 `semantic/typography.css` |
| `semantic/<theme>/English.tokens.json` 等字体模式文件 | 指定主题的排版覆盖 | 该主题的 `semantic/typography.css` |
| `semantic/radius.tokens.json` | 各主题共用的圆角默认值 | 各主题的 `semantic/radius.css` |
| `semantic/<theme>/radius.tokens.json` | 指定主题的完整圆角定义 | 该主题的 `semantic/radius.css` |
| `components/<component>.tokens.json` | 共享组件设计定义 | 两端组件目录内的 `design.tokens.css` / `design.tokens.ts` |

`English`、`中文`、`Numeric` 是当前支持的三个字体模式文件名。它们表示英文、中文、数字使用的字体；相同的字号、行高等设置会合并，不会生成三份排版文件。

主题从输入目录中发现，无需在脚本里维护 light/dark 白名单。增加主题时，应提供它的基础色板和语义颜色；共用字体和圆角会复制到该主题。**不同主题的颜色不会互相回退**，语义颜色引用的 primitive 必须存在于同一主题中。

### 2. 转换层：scripts/tokens

[转换脚本](scripts/generate-theme-tokens.mjs) 的处理顺序为：

1. 递归查找 `.tokens.json`，识别集合、主题和变量类别。
2. 展开嵌套分组，继承分组的 `$type`，忽略作为元数据的 `$` 字段。
3. 建立各主题的 primitive 索引，再解析语义颜色引用。
4. 合并字体默认值与主题覆盖，选择主题圆角或共用圆角。
5. 解析组件 token 引用，校验循环与类型；生成主题 CSS、组件 CSS，以及 RN 已解析主题。
6. 所有输入转换与校验成功后，才开始写入文件；`--check` 模式只比较文件。

CLI 在 `scripts/generate-theme-tokens.mjs`，同时生成两端。底层保留两个只处理主题 CSS 的兼容接口：

| 接口 | 职责 |
| --- | --- |
| `buildThemeFiles({ sourceDir? })` | 返回 `Map<相对输出路径, CSS 内容>`，不写文件 |
| `generateThemes({ sourceDir?, targetDir?, check?, quiet? })` | 写入文件，或以 `check: true` 校验现有产物；返回预期输出文件的完整路径列表 |

默认输入是项目根目录下的 `source/`。完整编译接口 `buildTokenFiles({ sourceDir? })` 和 `generateTokens({ sourceDir?, targetRoot?, check?, quiet? })` 从 `scripts/generate-theme-tokens.mjs` 导出；前者返回以仓库根目录为基准的输出 Map，后者生成或校验两端文件。兼容 CSS 接口默认输出 `packages/ui-react/src/components/themes/`。

校验涵盖重名、错误类型、无效颜色、悬空 primitive 引用、字体模式冲突、非法圆角和不存在的默认主题。它不提供文件系统层面的事务：写入阶段发生磁盘错误时，仍可能留下部分已更新文件。

### 3. 主题层：primitive 与 semantic

| 类别 | 变量示例 | 值的来源 |
| --- | --- | --- |
| 基础颜色 | `--theme-color-blue-500` | Figma 色值 |
| 语义颜色 | `--color-action-primary` | `var(--theme-color-blue-500)` |
| 字体 | `--font-family-zh`、`--font-family-en`、`--font-family-numeric` | 直接写字体名称 |
| 字号与行高 | `--text-base-size`、`--text-base-line-height` | 直接写带单位的数值 |
| 圆角 | `--radius-scale-md` | 直接写 `px` 数值 |

**颜色分为两层；typography 和 radius 只保留 semantic 一层。** semantic 变量不增加 `theme` 前缀。

语义颜色通过 Figma 的 `com.figma.aliasData` 获取 `targetVariableName`，生成到同主题 primitive 的 `var(...)` 引用。目标集合名称须符合当前的 `Primitive` / `Primitives` 命名，例如 `Primitives / 基础色板`。导出文件中缓存的语义色值不作为最终 CSS 值。

其他转换规则：

- 嵌套变量路径用 `-` 连接，名称转小写；驼峰、空格、斜线、下划线和点会规范化。
- 基础颜色支持六位、八位十六进制字符串，或 Figma `srgb` 对象；透明度保留为十六进制 alpha。
- 字号、行高等数字根据 Figma scopes 补 `px`；圆角统一输出 `px`，且必须为非负有限数字。
- 字体模式中的 `font.family.text` 分别转换为 `--font-family-en`、`--font-family-zh`、`--font-family-numeric`。
- 同一组字体模式的共用设置若值不同，脚本报错；主题字体设置可按变量覆盖全局默认值。
- 主题圆角文件存在时，整体替代共用圆角文件，不按单个圆角变量合并。

### 4. 组件类型层

[base.ts](packages/ui-react/src/components/types/base.ts) 定义组件的共用类型，包括尺寸、响应式断点、视觉变体、意图、布局、表单选项和生命周期接口。[button/type.ts](packages/ui-react/src/components/button/type.ts) 通过 `ButtonProps` 区分原生按钮与链接属性，包含图标、尺寸、变体、加载态和链接等属性。

[Button 实现](packages/ui-react/src/components/button/index.tsx) 负责渲染和状态，[src/client.ts](packages/ui-react/src/client.ts) 导出客户端组件，[src/index.ts](packages/ui-react/src/index.ts) 仅导出类型。原生按钮分支使用 `@base-ui/react/button`；链接分支直接渲染 `<a>`，保留原生导航语义。

## 生成与校验

仓库使用 `yarn.lock` 管理依赖。本次验证环境为 Node.js `22.13.0`、Yarn `1.22.22`；`package.json` 尚未声明 `engines`。

首次安装可执行以下命令；本次验证未单独测试全新目录安装：

```bash
yarn install --frozen-lockfile
```

依赖就绪后，在项目根目录运行：

```bash
npm run tokens:build   # 同时生成 Web 主题/组件 CSS 与 RN 主题
npm run tokens:check   # 只读检查两端生成文件及遗留产物
npm run tokens:test    # 主题机制与跨端编译回归测试
npm run button:test    # 运行 Button DOM、组件 token 约束及示例交互测试
npm test               # 运行所有自动测试
npm run typecheck      # 检查源码与 Button API 类型契约
```

也可使用 `yarn tokens:build` 等同名命令。脚本不需要额外环境变量。

修改时先更新 `source/`，再执行生成、校验和测试。生成文件带有 `Generated by npm run tokens:build; do not edit.` 标记，不应直接手工维护。

`tokens:check` 会检查预期 Web/RN 文件的缺失和内容差异，以及带有生成标记的多余文件；手写文件不纳入逐字节比较。生成命令不会自动删除旧产物，删除或重命名源文件后，应根据校验结果清理旧生成文件。

测试覆盖实际源数据的转换、生成一致性、主题隔离、字体覆盖、默认主题、入口导出完整性、引用有效性、透明度和异常输入。维护转换规则时，应同步更新这些测试。

## 组件示例与文档服务器

启动 [Storybook](https://storybook.js.org/docs/get-started/frameworks/react-vite)：

```bash
npm run dev
```

默认地址为 **http://127.0.0.1:6006**，修改组件、CSS 或 stories 后会热更新。`npm run storybook` 是同一个启动入口，关闭服务器可在运行终端按 `Ctrl+C`。

展示内容包括：

- **开始使用 / 项目介绍**：展示本 README，文档与项目说明共用一份内容。
- **组件 / Button**：可调参数用例、3 种变体与 5 种意图对照、7 档尺寸、状态和图标、链接、响应式尺寸、组件 tokens 覆盖。
- **Button 交互测试用例**：点击响应、禁用拦截、加载与焦点恢复、加载伸缩动画、表单提交。打开对应用例时会执行其 `play` 函数。
- **设计变量 / Semantic**：语义颜色、字体字号和圆角的可视化展示。

顶部工具栏可以选择默认主题、light 或 dark。主题列表从已生成的主题入口自动发现；“默认主题”会移除 `html` 的 `theme` 属性，使用 `source/themes.config.json` 对应的默认样式。可调试用例的 Controls 用于实时修改组件参数；需要检查响应式行为时，调整浏览器或 iframe 的视口宽度。

静态文档可单独构建：

```bash
npm run build:docs
```

Web 产物位于 `.storybook-static/web/`，这是组件文档站点的构建，与组件 npm 包的发布构建相互独立。

### 每个组件的示例与测试约定

当前项目只有 Button 一个可渲染的公共组件。它的示例和测试位于组件目录：

```text
packages/ui-react/src/components/button/
├── index.tsx
├── type.ts
├── tokens.css
├── styles.css
├── size.ts
├── index.css
├── Button.stories.tsx              # 可视示例、参数说明和交互 play 函数
└── button.test.mjs                 # DOM 行为、样式约束及示例交互回归
```

新增组件时，在对应目录添加 `组件名.stories.tsx` 和 `组件名.test.mjs`。Storybook 自动发现 `packages/ui-react/src/components/**/*.stories.tsx`；`npm test` 自动执行 `packages/ui-react/src/components/*/*.test.mjs`，无需逐个修改服务器配置或测试命令。

示例至少包含默认状态、支持的视觉变体和尺寸、禁用与加载状态、关键交互。组件通过自身 tokens 设置样式，示例使用真实组件，避免另写一份预览实现。

Button 的五个 `play` 交互用例同时由 `npm test` 在 DOM 测试环境中执行，复用页面展示的同一份交互逻辑。它们验证行为，不替代真实浏览器中的视觉验收。

### 本地构建配置

`apps/storybook-web/.storybook/main.mjs` 使用 React + Vite，并为文档站点单独配置标准 CSS 处理，与消费端的 Tailwind/PostCSS 配置隔离。

项目使用 `node_modules`。当前机器的上级目录存在其他项目的 Yarn PnP 配置，可能被 esbuild 误识别；根目录的 `.pnp.data.json` 将本项目路径排除在 PnP 解析之外，使依赖继续从本项目 `node_modules` 读取，不修改上级目录配置。

## 默认主题与使用方式

默认主题配置位于 [source/themes.config.json](source/themes.config.json)：

```json
{
  "defaultTheme": "light"
}
```

修改后需要重新生成 CSS。默认主题名称必须与生成的主题名称一致，否则脚本报错。

默认主题的所有 token 文件会使用以下作用域：

```css
html:not([theme]),
html[theme='light'] {
  /* 当前默认主题的变量 */
}
```

因此，未设置 `theme` 属性时使用默认主题；显式属性优先决定主题。`theme=""` 或不存在的主题名不会触发默认回退。若删除配置文件或不设置 `defaultTheme`，生成结果仅包含显式主题选择器。

在支持 CSS 导入的应用中，导入本仓库的主题总入口即可使用所有主题。下面以应用入口位于本项目 `packages/ui-react/src/` 下为例，路径需随使用位置调整：

```ts
import './components/themes/index.css';
```

需要只加载一种主题时，可导入对应的 `light/index.css` 或 `dark/index.css`。仅导入非默认主题时，需要显式设置匹配的 `theme` 属性。

```html
<!-- 不设置属性：使用配置中的默认主题 -->
<html>

<!-- 显式使用深色主题 -->
<html theme="dark">
```

浏览器中可以切换或恢复默认主题：

```js
document.documentElement.setAttribute('theme', 'dark');
document.documentElement.removeAttribute('theme');
```

组件样式使用 semantic 变量，例如：

```css
.example-card {
  background: var(--color-surface-container);
  color: var(--color-text-primary);
  border-radius: var(--radius-scale-md);
  font-family: var(--font-family-zh);
  font-size: var(--text-base-size);
  line-height: var(--text-base-line-height);
}
```

字体 tokens 仅声明字体名称，项目没有提供字体文件或自动加载字体的代码。主题机制也不包含本地存储、跟随系统配色或运行时主题管理器，这些由应用接入时决定。

## Button 与组件 tokens

源码使用示例（相对路径以项目根目录为例）：

```tsx
import { Button } from './packages/ui-react/src/client';
import './packages/ui-react/src/styles.css';

<Button intent="brand" variant="fill" onClick={() => console.log('提交')}>提交</Button>;
<Button intent="success" variant="outline" size={{ base: 'base', sm: 'xs', lg: 'lg' }}>响应式尺寸</Button>;
<Button link="/account" target="_blank" rel="noreferrer">账户</Button>;
<Button loading>提交中</Button>;
```

`packages/ui-react/src/styles.css` 导入所有主题及 Button、Icon、Loading 样式。Button 和 Loading 自身也导入局部样式；直接导入组件时仍需接入主题样式，以提供 semantic 变量。

| API | 支持值与默认行为 |
| --- | --- |
| `intent` | `normal`（默认）、`brand`、`success`、`warning`、`danger` |
| `variant` | `fill`（默认）、`outline`、`ghost` |
| `size` | `2xs` / `xs` / `sm` / `base`（默认）/ `lg` / `xl` / `2xl`，或响应式尺寸对象 |
| `shape` | `rect`（默认）/ `square`；square 宽高均取当前尺寸的 height，padding 为 0；配合 round 得到圆形 |
| `widthMode` | `auto`（默认）/ `fixed`；fixed 锁定内容区宽度，文案超出时省略，保留图标 |
| `block` / `round` | 默认关闭；分别设置整行宽度、胶囊圆角 |
| `prefixIcon` / `suffixIcon` | 文案前后图标，作为装饰内容隐藏于辅助技术；loading 时前置图标由局部 spinner 替换 |
| `disabled` / `loading` | 默认关闭；均阻止激活，loading 保留文案与后置图标，显示 spinner 并设置 `aria-busy` |
| `link` | 存在时渲染原生链接，支持 `target`、`rel`；禁用或加载时移除 `href` 并拦截点击 |
| `type` | 原生按钮默认 `button`，显式 `submit` 才用于表单提交 |
| `ref` / `onClick` | 根据是否提供 `link`，分别对应 `HTMLAnchorElement` 或 `HTMLButtonElement` |

响应式尺寸的断点为 `sm: 40rem`、`md: 48rem`、`lg: 64rem`、`xl: 80rem`、`2xl: 96rem`。移动端默认使用 `base`，未设置的断点沿用较小断点的值，无需 JavaScript 监听窗口。

Web Button 的宽度优先级为 `block > shape > widthMode`：block 会使用 rect + auto；square 会使用 auto，冲突组合在开发环境发出提示。`round` 独立控制圆角，圆形使用 `shape="square" round`，没有 `shape="circle"`。这些属性同样适用于 link 模式。Button 通过 `className` 覆盖局部 tokens，不开放 `style`。

```tsx
<Button shape="square" round prefixIcon={<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" /></svg>} aria-label="添加" />;
<Button widthMode="fixed" prefixIcon={<span>→</span>}>较长按钮文案会显示省略号</Button>;
<Button widthMode="fixed" size={{ base: 'sm', lg: 'xl' }}>响应式固定宽度</Button>;
```

`source/components/button.tokens.json` 中的 `sizes.<size>.fixed-width` 定义整个内容区（图标、间距、文案）的宽度；两侧 padding 和 border 另外叠加。外框总宽为 `fixed-width + 2 × padding-x + 2 × border-width`，固定模式在 flex 容器内不会自动收缩。七档内容区默认宽度如下，可在源文件中调整后运行 `npm run tokens:build`：

| size | 2xs | xs | sm | base | lg | xl | 2xl |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fixed-width（px） | 48 | 64 | 80 | 96 | 112 | 128 | 160 |

Storybook 的“组件/Button”新增“形状与圆角”“固定内容区宽度与省略”，覆盖七档尺寸、图标、loading、链接和响应式用法。以上 shape / widthMode API 当前属于 Web Button，RN 尚未开放这两个属性。

进入和退出 loading 时，前置槽位以 `--button-loading-duration`（默认 `200ms`）和 `--button-loading-easing`（默认 `ease`）平滑展开或收起，无需测量按钮宽度。已有前置图标时原位替换；整行按钮保持整行宽度。非加载状态不渲染 spinner；系统开启减少动态效果时关闭过渡和旋转动画。fixed / square 模式在加载切换时外框尺寸保持不变。

loading 中的原生按钮通过 Base UI 保留焦点；`disabled` 则使用原生 disabled。图标按钮需由使用方提供 `aria-label`。spinner 遵循 `prefers-reduced-motion`，键盘焦点使用可见 outline。loading 保留 intent 配色并使用 loading-opacity；disabled 与 loading 同时设置时，禁用配色和 disabled-opacity 优先。

组件 tokens 分层参考 [Bootstrap Button 局部 CSS 变量](https://getbootstrap.com/docs/5.3/components/buttons/#css)：

```text
primitive 颜色 → semantic 颜色 ─┐
semantic 字体、圆角 ────────────┴→ button/tokens.css → button/styles.css
```

- [design.tokens.css](packages/ui-react/src/components/button/design.tokens.css)：自动生成共享设计映射、尺寸、意图色彩。
- [tokens.css](packages/ui-react/src/components/button/tokens.css)：手写 Web 布局、状态组合、焦点样式、加载动画和显式响应式尺寸，仅消费共享设计值。
- [styles.css](packages/ui-react/src/components/button/styles.css)：样式属性只消费 `--button-*`，不直接读取 semantic 或 primitive 变量。intent 和 variant 修改局部 tokens，统一的状态规则消费它们。
- [size.ts](packages/ui-react/src/components/button/size.ts)：根据 `size` 生成内部 `--button-*` 引用，响应式切换交由媒体查询完成。

组件颜色直接映射已有 semantic tokens，不使用 `color-mix` 或其他方式派生颜色。主操作按钮使用 `action-primary` 的默认、hover 和 active 语义色；success、warning、danger 尚无独立的 hover/active 语义色，因此复用各自的反馈色。outline、ghost 的交互背景使用 `fill-hover` 和 `fill-active`。新增状态色应先在设计 tokens 中定义。

使用方可以通过业务 class 覆盖 Button tokens，不必修改主题文件：

```css
/* 放在组件样式之后。 */
.my-action {
  --button-border-radius: 8px;
  --button-bg: var(--color-action-primary);
  --button-hover-bg: var(--color-action-primary-hover);
}
```

组件行为依据 [Base UI Button](https://base-ui.com/react/components/button)；链接保留原生 `<a>`，不通过 Base UI 的 `render` 属性模拟链接。

## Loading 与组件 tokens

```tsx
import { Loading } from './packages/ui-react/src/client';
import './packages/ui-react/src/styles.css';

<Loading />;
<Loading type="rect" size={32} fillColor="var(--color-action-link)" speed={1200} />;
<Loading type="logo" size="xl" />;
<Loading size={{ base: 'base', sm: 'xs', lg: 'lg', '2xl': '2xl' }} />;
```

`type` 默认为 `normal`，复用 `BKIcon name="loader"` 的旋转动画；`rect` 使用五根错峰伸缩的柱子；`logo` 使用 BitKan Logo 原始路径，从左到右显现、停留后淡出。

`size` 支持与 Button 相同的七档尺寸、响应式对象，以及像素数值。七档高度依次为 14、16、18、20、22、24、28px，默认为 `base`（20px）；Logo 按其 `1024 / 300` 比例计算宽度。响应式对象必须显式提供 `base`；仅配置的断点参与尺寸切换。

`fillColor` 默认继承当前文字颜色；`speed` 是一次循环的毫秒数，normal、rect、logo 默认分别为 800、1000、3320ms。无效速度回退到类型默认值。组件支持原生 span 属性和 ref，默认以 `role="status"`、名称“加载中”提供状态语义；父组件已处理加载提示时，可传入 `aria-hidden` 避免重复播报。

- [tokens.css](packages/ui-react/src/components/loading/tokens.css)：定义 `--loading-*` 尺寸、颜色、动画和圆角映射。
- [styles.css](packages/ui-react/src/components/loading/styles.css)：仅消费 Loading tokens；包含响应式尺寸和减少动态效果规则。
- [size.ts](packages/ui-react/src/components/loading/size.ts)：生成尺寸 token 引用。
- [logo.tsx](packages/ui-react/src/components/loading/logo.tsx)：保留原始 Logo 路径，使用独立裁剪 ID，支持同页多个实例和服务端水合。

通过业务 class 或 `style` 覆盖 `--loading-size`、`--loading-color`、`--loading-duration` 可以定制样式。Web Button 使用独立的局部 spinner，尺寸绑定到 `--button-icon-size`，颜色继承按钮文字；RN Button 继续使用原生 Loading 组件。

验证命令：`npm run loading:test`、`npm run button:test`、`npm run typecheck`。Storybook 的“组件/Loading”包含三种动画、全部尺寸、响应式、颜色/速度、组件 tokens 及 Button 集成示例。

## 尺寸完整性与错误处理

组件样式使用单一变量引用，例如 `var(--button-xl-height)`，不提供 `var()` 默认值来掩盖缺失的定义。编译器要求 Button 七档尺寸中的 height、padding-x、padding-y、font-size、line-height、gap、icon-size、fixed-width 全部存在；Loading 同样要求七档尺寸完整。缺失项在写入任何平台文件之前报错，错误中包含源文件及完整 token 路径，例如：

```text
source/components/button.tokens.json：缺少尺寸 token components.button.sizes.xl.height
```

两端响应式 size 均要求 `base`，例如 `size={{ base: 'sm', lg: 'xl' }}`。只有声明的断点会切换尺寸，未声明的断点不会生成覆盖规则；这与引用一个缺失的尺寸定义不同。未知尺寸、未知断点、缺少 base，以及无效的数字尺寸均直接抛错。未传 size 时仍使用组件声明的默认值 `base`。

## 共享组件 token 格式与 RN 使用

组件定义按文件区分组件名，例如 `source/components/button.tokens.json`。当前支持 `base`、`sizes.<size>`、`intents.<intent>` 三类分组，可继承 `$type`。示例为：

```json
{
  "base": {
    "border-radius": {
      "$type": "dimension",
      "$value": "{semantic.radius-scale-md}"
    }
  },
  "sizes": {
    "base": {
      "height": {
        "$type": "dimension",
        "$value": { "value": 40, "unit": "px" }
      }
    }
  }
}
```

这是格式片段，不能替换完整 Button 定义。引用使用规范化后的 ID：`primitive.brand-500`（示意名称）、`semantic.color-action-primary`、`semantic.text-base-size`、`components.button.base.border-width`。允许链式引用，拒绝悬空引用、循环和类型不匹配。不能引用 intent 局部变量，因为它在 CSS 中受选择器影响。

组件值支持 `color`、`dimension`、`number`、`string`；dimension 直接值目前只接受 px。px 在 Web 输出中保留单位，在 RN 中按相同设计数值输出为逻辑尺寸，不进行 PixelRatio 倍乘。字体 Figma scopes 用于区分数值是否为尺寸。阴影、渐变、复合排版和平台特定单位暂未实现，遇到不支持的组件类型会报错。

Web 保留 CSS 引用关系，RN 每个主题解析出真实值。运行时切换 RN 的 ThemeProvider 会更新组件；新增 RN 组件通过 `useTheme()` 消费基础与语义值，并从自己目录的 `design.tokens.ts` 读取组件设计值。全局主题没有 `components` 字段。RN Button 支持七档及响应式尺寸、五种 intent、三种 variant、loading、disabled、round、block 和前后图标插槽。RN Icon 使用 react-native-svg 渲染共用路径，支持 Figma regular/filled 与旧图标名；RN Loading 提供 normal/rect/logo 三种动画、数字或响应式尺寸、速度、颜色和减少动态效果。Web 的 DOM 事件、链接导航、SSR 空闲占位等保留为平台接口，RN 使用 onPress 与原生无障碍属性。

```tsx
import '@bkreact/ui-native/styles.css';
import { Button, ThemeProvider } from '@bkreact/ui-native';

export function Example() {
  return (
    <ThemeProvider mode="dark">
      <Button intent="brand" onPress={() => console.log('submit')}>
        提交
      </Button>
    </ThemeProvider>
  );
}
```

RN 默认使用系统字体。应用自行加载字体文件，再传入 `ThemeProvider fontFamily="已注册的字体名"`；Figma 导出的字体名并不代表字体文件已经安装。RN 的 TypeScript tokens 由 Metro/Vite 随组件源码转译，发布组件包时一起构建。基础与语义值保留在主题中，组件设计值按组件分别导入。

## NativeWind V5 接入

当前固定 `nativewind@5.0.0-rc.0` 与 `react-native-css@3.1.0-rc.0`。这是 V5 RC 配对版本，不是 V4 的配置方式。开发依赖使用 RN 0.86.3、Reanimated 4.5.1、Worklets 0.10.1、Tailwind/@tailwindcss/postcss 4.1.12；React 沿用项目现有 19.3.1。lightningcss 对 NativeWind 编译器固定 1.30.1，Vite 的依赖单独解析。[官方安装说明](https://www.nativewind.dev/v5/getting-started/installation)

原生应用配置 Metro（以下为使用 React Native Metro 配置的示例；Expo 应用可使用自己的 getDefaultConfig）：

```js
const { getDefaultConfig } = require('@react-native/metro-config');
const withBKNativewind = require('@bkreact/ui-native/metro');
module.exports = withBKNativewind(getDefaultConfig(__dirname));
```

应用的 PostCSS 配置需启用 `@tailwindcss/postcss`，并在顶层 App/布局中导入一次 `@bkreact/ui-native/styles.css`。这个入口包含 Tailwind、NativeWind 和本地 `components/themes/tokens.css` 的语义映射，并通过 `@source` 扫描组件源码。组件使用显式 styled 适配器，不依赖库发布时运行 Babel 的全局替换；应用自身的 className 由 Metro 包装器处理。库本身不导入全局 CSS，避免隐式重复注册。

`ThemeProvider` 通过 V5 的 `VariableContextProvider` 只注入语义变量；Button、Loading 在自身作用域注入私有变量。长度变量带 px 单位，在原生编译后成为逻辑尺寸；`withBKNativewind` 设置 `inlineVariables: false`，保留运行时切换主题及组件状态的能力。不要直接把 Web 的 `html[theme]` 选择器交给原生编译器。[动态主题说明](https://www.nativewind.dev/v5/guides/themes)

Tailwind 映射使用 `bk-` 前缀，例如 `bg-bk-action-primary`、`text-bk-text-primary`、`text-bk-base` 和 `rounded-bk-scale-md`。Button 和 Loading 支持 className，Button 另有 textClassName；工具类通过 tailwind-merge 合并，调用方同组工具类覆盖默认工具类。数值 style、SVG 属性和动画值保留原生形式。

```tsx
<Button className="px-8" textClassName="text-lg" intent="brand">
  自定义间距与字号
</Button>
```

Web/RN 图标注册表及原始 Logo 路径集中在 `packages/assets/src/`。图标源变更后执行 `npm run icons:build`；直接修改资源包源码后执行 `npm run build --workspace=@bkreact/assets`。根目录 dev、文档构建、测试、类型检查会先构建资源包。

## 两端文档与构建

```bash
npm run dev                 # React 文档，127.0.0.1:6006
npm run dev:native          # RN 浏览器文档，127.0.0.1:6007
npm run build:docs          # .storybook-static/web/
npm run build:docs:native   # .storybook-static/native/
npm run build               # 生成 tokens，构建 Web/RN 组件及类型声明
npm run typecheck           # 两端类型检查
npm test                    # Web 回归、跨端编译及 RN Web 渲染测试
```

RN 浏览器文档通过 react-native-web 渲染，包含 Button、Icon、Loading 和 NativeWind 主题示例，独立使用 ThemeProvider；Web 工具栏设置 HTML theme 属性。此仓库尚未创建 iOS/Android 示例应用或实机 Storybook，浏览器测试不能替代原生触摸、字体和布局验证。

`@bkreact/ui` 的包名及 `client`、`styles.css` 等入口保留。资源包和两个组件包各自输出到 `packages/<包>/dist/`；Web CSS 会随构建复制并保留相对导入结构。原先指向不存在文件的 `safelist.css` 导出已移除。TypeScript 使用 5.9 系列以兼容当前 tsup 声明构建和 RN 文档插件。没有执行 npm 发布。

## 维护原则

- 视觉契约使用“视觉用途”，不绑定具体元素：例如使用 `surface-container`、`text-primary` 表达用途。
- 区分值变化与契约变化：主题色值调整保持变量名稳定；变量新增、删除、重命名时，检查使用方和类型约定。
- 设计数据、转换规则、生成产物分别维护；修改规则后运行一致性校验和回归测试。
- 缺失尺寸和样式定义通过明确错误暴露，修复对应源文件；不增加默认值或回退链掩盖问题。
