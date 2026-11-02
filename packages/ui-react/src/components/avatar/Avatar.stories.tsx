import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback, AvatarImage } from './index';
import { componentSizes } from '../utils/size';

// 内嵌图片使示例不依赖外部网络。
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#dbeafe"/><circle cx="40" cy="29" r="14" fill="#2563eb"/><path d="M12 80a28 28 0 0 1 56 0" fill="#2563eb"/></svg>')}`;

const meta = {
  title: '组件/Avatar',
  component: Avatar,
  subcomponents: { AvatarImage, AvatarFallback },
  tags: ['autodocs'],
  args: { size: 'base', round: false },
  argTypes: {
    size: { control: 'select', options: componentSizes, description: '七档尺寸；响应式对象必须提供 base。缺少 base、无效档位或未知断点会在渲染期抛错（包括生产环境及 SSR），请在数据边界校验或兜底。根元素的 data-size 与 data-size-{breakpoint} 由组件接管，用户传入会被忽略。' },
    round: { control: 'boolean', description: '圆形头像；默认 false，使用圆角方形。' },
    children: { control: false, description: '组合 AvatarImage、AvatarFallback，也可直接显示文字。' },
    className: { control: false, description: '样式类或状态函数；通过 CSS 类覆盖局部 --avatar-* tokens，不提供 style 参数。' },
    render: { control: false, description: '替换根元素或与其他组件组合，默认渲染 span。' },
  },
  parameters: {
    docs: {
      description: {
        component: '基于 Base UI Avatar。通过 @bkreact/ui/client 导入 Avatar、AvatarImage、AvatarFallback，并在应用入口引入 @bkreact/ui/styles.css。Avatar 管理尺寸与形状，AvatarImage 管理图片加载，AvatarFallback 在图片未加载或失败时展示。替代内容需显式提供。样式只消费局部 --avatar-* tokens，支持主题切换。',
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '可调试用例',
  parameters: {
    docs: { description: { story: '图片默认预加载，成功后才渲染。为有信息含义的图片提供 alt，为替代内容提供对应的可访问名称；装饰性头像使用空 alt，并对替代内容设置 aria-hidden。' } },
  },
  render: args => (
    <Avatar {...args}>
      <AvatarFallback role="img" aria-label="用户头像">BK</AvatarFallback>
      <AvatarImage src={image} alt="用户头像" />
    </Avatar>
  ),
};

export const Sizes: Story = {
  name: '七档尺寸',
  parameters: {
    docs: { description: { story: '2xs、xs、sm、base、lg、xl、2xl 对应 24、28、32、40、48、56、64px 的正方形尺寸，字号随档位变化。' } },
  },
  render: args => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {componentSizes.map(size => (
        <Avatar {...args} key={size} size={size}>
          <AvatarFallback>BK</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};

export const Round: Story = {
  ...Default,
  name: '圆形头像',
  args: { round: true },
  parameters: {
    docs: { description: { story: 'round 使用圆形外观，默认关闭时使用主题圆角；形状与尺寸独立。' } },
  },
};

export const FailedImage: Story = {
  name: '图片失败回退',
  parameters: {
    docs: { description: { story: '加载失败后显示 AvatarFallback。可通过 delay 设置首次显示前的等待时间（毫秒，默认 0）；AvatarImage.onLoadingStatusChange 可接收 idle、loading、loaded、error 状态。' } },
  },
  render: args => (
    <Avatar {...args}>
      <AvatarFallback role="img" aria-label="用户头像">BK</AvatarFallback>
      <AvatarImage src="data:image/png;base64,invalid" alt="用户头像" />
    </Avatar>
  ),
};

export const Responsive: Story = {
  ...Default,
  name: '响应式尺寸',
  parameters: {
    docs: { description: { story: 'size 对象必须提供 base。断点为 sm: 40rem、md: 48rem、lg: 64rem、xl: 80rem、2xl: 96rem；未配置的断点沿用当前尺寸，由 CSS 媒体查询切换。data-size="sm" 仅标记固定档位；响应式时 data-size="responsive"，data-size-md 等属性用于启用对应断点，不代表尺寸档位。尺寸标记由组件管理。' } },
  },
  args: { size: { base: 'xs', md: 'lg', xl: '2xl' }, round: true },
};

export const LazyImage: Story = {
  name: '懒加载',
  parameters: {
    docs: { description: { story: 'loading="lazy" 需配合 keepMounted。图片层级高于替代内容，两个部件的 DOM 顺序不影响覆盖关系。加载中或失败的图片通过 visibility 隐藏，保留原生懒加载所需的布局盒；实际加载时机由浏览器决定，JSDOM 测试不验证浏览器的视口加载行为。' } },
  },
  render: args => (
    <Avatar {...args}>
      <AvatarFallback role="img" aria-label="用户头像">BK</AvatarFallback>
      <AvatarImage keepMounted loading="lazy" src={image} alt="用户头像" />
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  name: '仅替代内容',
  render: args => (
    <Avatar {...args}>
      <AvatarFallback role="img" aria-label="用户头像">BK</AvatarFallback>
    </Avatar>
  ),
};
