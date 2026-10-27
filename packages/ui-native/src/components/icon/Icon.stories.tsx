import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { BKIcon } from './index';
import { figmaIconNames } from '@bkreact/assets/icons';
const meta = {
  title: '组件/Icon', component: BKIcon, tags: ['autodocs'],
  args: { name: figmaIconNames[0], variant: 'regular', size: 24 },
  argTypes: { name: { control: 'select', options: figmaIconNames }, variant: { control: 'inline-radio', options: ['regular', 'filled'] } },
} satisfies Meta<typeof BKIcon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const FigmaVariants: Story = { render: args => <View style={{ flexDirection: 'row', gap: 16 }}><BKIcon {...args} variant="regular" /><BKIcon {...args} variant="filled" /></View> };
