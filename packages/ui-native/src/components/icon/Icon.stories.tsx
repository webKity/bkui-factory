import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { BKIcon } from './index';
import { figmaIconNames } from '@bkreact/assets/icons';
const meta = {
  title: '组件/图标', component: BKIcon, tags: ['autodocs'],
  args: { name: figmaIconNames[0], variant: 'regular', size: 24 },
  argTypes: { name: { control: 'select', options: figmaIconNames }, variant: { control: { type: 'inline-radio', labels: { regular: '线性', filled: '实心' } }, options: ['regular', 'filled'] } },
} satisfies Meta<typeof BKIcon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { name: '可调试用例' };
export const FigmaVariants: Story = { name: '线性与实心图标', render: args => <View style={{ flexDirection: 'row', gap: 16 }}><BKIcon {...args} variant="regular" /><BKIcon {...args} variant="filled" /></View> };
