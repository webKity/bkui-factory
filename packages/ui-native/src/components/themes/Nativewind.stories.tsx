import { useState } from 'react';
import { ThemeProvider, useThemeContext } from './index';
import { Button } from '../button';
import { Loading } from '../loading';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StyledText, StyledView } from '../utils/styled';
function NativewindExample() {
  return <StyledView className="gap-4">
    <StyledView className="bg-bk-action-primary rounded-bk-scale-md p-4">
      <StyledText className="text-white text-bk-lg">Figma → NativeWind V5</StyledText>
    </StyledView>
    <StyledText className="text-bk-text-primary text-bk-base">切换顶部主题，验证语义颜色与字体尺寸。</StyledText>
  </StyledView>;
}
const meta = { title: '设计变量/NativeWind', component: NativewindExample } satisfies Meta<typeof NativewindExample>;
export default meta;
export const Theme: StoryObj<typeof meta> = {};


function RuntimeThemeExample() {
  const { mode } = useThemeContext();
  const [custom, setCustom] = useState(false);
  return <ThemeProvider mode={mode} overrides={custom ? {
    primitive: { 'blue-500': '#A21CAF' },
    semantic: { 'text-base-size': 20, 'text-base-line-height': 28, 'radius-scale-md': 14, 'color-text-primary': '#A21CAF' },
  } : undefined}>
    <StyledView className="gap-4">
      <Button onPress={() => setCustom(value => !value)}>切换运行时主题</Button>
      <StyledView className="bg-bk-action-primary rounded-bk-scale-md p-4">
        <StyledText className="text-white text-bk-base">基础色 → 语义色 → NativeWind 工具类</StyledText>
      </StyledView>
      <Button intent="brand">当前语义色、字号与圆角</Button>
      <Loading type="rect" />
    </StyledView>
  </ThemeProvider>;
}
export const RuntimeTokens: StoryObj<typeof meta> = {
  name: '三层 tokens 实时联动',
  render: () => <RuntimeThemeExample />,
  parameters: { docs: { description: { story: '保持 mode 不变，修改 primitive 与 semantic。组件从当前 ThemeProvider 的 TypeScript theme 生成局部 tokens；无需重新生成 CSS。再次点击恢复预置主题。' } } },
};
