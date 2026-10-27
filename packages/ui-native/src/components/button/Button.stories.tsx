import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { Button } from './index';
import { BKIcon } from '../icon';
import type { IBKIntent, IBKSize, IBKVariants } from '../types/base';

const sizes: IBKSize[] = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];
const intents: IBKIntent[] = ['brand', 'success', 'danger', 'warning', 'normal'];
const variants: IBKVariants[] = ['outline', 'fill', 'ghost'];
const icon = <BKIcon name="check" />;
const meta = {
  title: '组件/Button', component: Button, tags: ['autodocs'],
  args: { children: '确认操作', intent: 'brand', variant: 'fill', size: 'base', shape: 'rect', widthMode: 'auto', loading: false, disabled: false, round: false, block: false },
  argTypes: {
    intent: { control: 'select', options: intents },
    variant: { control: 'inline-radio', options: variants },
    size: { control: 'select', options: sizes },
    shape: { control: 'inline-radio', options: ['rect', 'square'], description: 'square 宽高相等、padding 为 0；与 round 组合为圆形。' },
    widthMode: { control: 'inline-radio', options: ['auto', 'fixed'], description: 'fixed 锁定内容区宽度；优先级 block > shape > widthMode。' },
    prefixIcon: { control: false }, suffixIcon: { control: false },
    onPress: { action: 'press' },
  },
  parameters: {
    docs: { description: { component: 'React Native Button，基于 NativeWind V5，共享 Web 的组件设计 tokens、形状与宽度规则。fixed 模式单行省略文案，保留图标；loading 替换前置图标并平滑展开槽位，系统减少动态效果时关闭动画。此页面通过 react-native-web 预览，原生触摸、字体和布局需在 iOS/Android 验证。' } },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Variants: Story = {
  name: '变体与意图',
  render: () => <View style={{ gap: 12 }}>{variants.map(variant => <View key={variant} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {intents.map(intent => <Button key={intent} variant={variant} intent={intent}>{`${variant} / ${intent}`}</Button>)}
  </View>)}</View>,
};
export const Shapes: Story = {
  name: '形状与圆角',
  render: () => <View style={{ gap: 12 }}>{sizes.map(size => <View key={size} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Text>{size}</Text>
    <Button size={size}>矩形</Button><Button size={size} round>胶囊</Button>
    <Button size={size} shape="square" prefixIcon={icon} accessibilityLabel="方形确认" />
    <Button size={size} shape="square" round prefixIcon={icon} accessibilityLabel="圆形确认" />
    <Button size={size} shape="square" round loading accessibilityLabel="正在提交" />
  </View>)}</View>,
};
export const FixedWidth: Story = {
  name: '固定内容区宽度与省略',
  render: () => <View style={{ gap: 12 }}>{sizes.map(size => <View key={size} style={{ flexDirection: 'row', gap: 12 }}>
    <Button size={size} widthMode="fixed">{size}</Button>
    <Button size={size} widthMode="fixed" prefixIcon={icon} suffixIcon={icon}>这是一段需要被截断省略的长按钮文案</Button>
    <Button size={size} widthMode="fixed" loading>正在提交较长按钮文案</Button>
  </View>)}</View>,
};
export const Responsive: Story = {
  name: '响应式与整行宽度',
  render: () => <View style={{ gap: 12 }}>
    <Button widthMode="fixed" size={{ base: 'sm', md: 'lg', xl: '2xl' }}>响应式固定宽度</Button>
    <Button block prefixIcon={icon}>占据容器整行</Button>
  </View>,
};
function LoadingExample() {
  const [loading, setLoading] = useState(false);
  return <View style={{ gap: 12 }}>
    <Button onPress={() => setLoading(value => !value)}>切换 loading</Button>
    <Button loading={loading}>自动宽度平滑伸缩</Button>
    <Button loading={loading} prefixIcon={icon}>替换前置图标</Button>
    <Button loading={loading} widthMode="fixed" suffixIcon={icon}>固定宽度保持外框</Button>
    <Button loading={loading} shape="square" round prefixIcon={icon} accessibilityLabel="确认" />
    <Button loading={loading} disabled>disabled 样式优先</Button>
  </View>;
}
export const LoadingAnimation: Story = { name: '加载伸缩动画', render: () => <LoadingExample /> };
