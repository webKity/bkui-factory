import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from './index';

const meta = {
  title: '组件/Button', component: Button, tags: ['autodocs'],
  args: { children: '确认操作', intent: 'brand', variant: 'fill', size: 'base', loading: false, disabled: false },
  argTypes: {
    intent: { control: 'select', options: ['normal', 'brand', 'success', 'warning', 'danger'] },
    variant: { control: 'inline-radio', options: ['fill', 'outline', 'ghost'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    onPress: { action: 'press' },
  },
  parameters: {
    docs: { description: { component: 'React Native Button，使用共享 Figma tokens。此页面通过 react-native-web 预览；原生触摸、字体和平台行为需在 iOS/Android 验证。' } },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Variants: Story = {
  render: args => <View style={{ gap: 12 }}>
    <Button {...args} variant="fill">填充按钮</Button>
    <Button {...args} variant="outline">描边按钮</Button>
    <Button {...args} variant="ghost">无边框按钮</Button>
  </View>,
};
