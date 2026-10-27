import { createRef } from 'react';
import { View } from 'react-native';
import type { ElementRef } from 'react';
import { Button } from '../packages/ui-native/src';
import type { ButtonShape, ButtonWidthMode } from '../packages/ui-native/src';

const shape: ButtonShape = 'square';
const widthMode: ButtonWidthMode = 'fixed';
const ref = createRef<ElementRef<typeof View>>();
<Button ref={ref} shape={shape} round accessibilityLabel="确认" />;
<Button widthMode={widthMode} size={{ base: 'sm', lg: 'xl' }} onPress={event => event.nativeEvent}>固定宽度</Button>;
<Button block style={{ marginTop: 8 }} textStyle={{ fontWeight: '700' }} />;
// @ts-expect-error 圆形由 square + round 组合。
<Button shape="circle" />;
// @ts-expect-error widthMode 只支持 auto / fixed。
<Button widthMode="full" />;
// @ts-expect-error 响应式尺寸必须提供 base。
<Button size={{ lg: 'xl' }} />;
// @ts-expect-error hovered 是内部交互状态。
<Button hovered />;
// @ts-expect-error pressed 是内部交互状态。
<Button pressed />;
// @ts-expect-error 原生跳转由调用方通过 onPress 接入导航。
<Button link="/account" />;

const { ThemeProvider, createTheme } = await import('../packages/ui-native/src');
<ThemeProvider overrides={{ primitive: { 'blue-500': '#123456' }, semantic: { 'text-base-size': 20 } }}><Button /></ThemeProvider>;
createTheme('dark', { semantic: { 'radius-scale-md': 12 } });
// @ts-expect-error 语义尺寸必须使用数值，不能传入 CSS 字符串。
createTheme('light', { semantic: { 'text-base-size': '20px' } });
// @ts-expect-error 拒绝未知的语义 token。
createTheme('light', { semantic: { 'missing-color': '#123456' } });
