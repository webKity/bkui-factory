import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Loading } from './index';
const meta = {
  title: '组件/Loading', component: Loading, tags: ['autodocs'],
  args: { type: 'normal', size: 'base' },
  argTypes: { type: { control: 'inline-radio', options: ['normal', 'rect', 'logo'] }, size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] } },
} satisfies Meta<typeof Loading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Types: Story = { render: args => <View style={{ gap: 24 }}><Loading {...args} type="normal" /><Loading {...args} type="rect" /><Loading {...args} type="logo" /></View> };
