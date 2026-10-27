import type { Preview } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { themes, defaultTheme } from '../../../packages/ui-native/src/components/themes/tokens';
import type { ThemeName } from '../../../packages/ui-native/src/components/themes/tokens';
import { ThemeProvider } from '../../../packages/ui-native/src/components/themes';
import '../../../packages/ui-native/src/styles.css';

const preview: Preview = {
  globalTypes: {
    theme: { toolbar: { icon: 'circlehollow', dynamicTitle: true, items: Object.keys(themes) } },
  },
  initialGlobals: { theme: defaultTheme },
  decorators: [(Story, context) => {
    const mode = context.globals.theme as ThemeName;
    return <ThemeProvider mode={mode}>
      <View style={{ padding: 24, backgroundColor: themes[mode].semantic['color-surface-page'] }}><Story /></View>
    </ThemeProvider>;
  }],
};
export default preview;
