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
