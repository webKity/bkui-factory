import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Loading } from './index';
const meta = {
  title: '组件/加载指示器', component: Loading, tags: ['autodocs'],
  args: { type: 'normal', size: 'base' },
  argTypes: { type: { control: { type: 'inline-radio', labels: { normal: '旋转图标', rect: '伸缩柱状', logo: '品牌标志' } }, options: ['normal', 'rect', 'logo'] }, size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] } },
} satisfies Meta<typeof Loading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { name: '可调试用例' };
export const Types: Story = { name: '加载类型', render: args => <View style={{ gap: 24 }}><Loading {...args} type="normal" /><Loading {...args} type="rect" /><Loading {...args} type="logo" /></View> };
