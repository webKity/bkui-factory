/** @type {import('@storybook/react-native-web-vite').StorybookConfig} */
export default {
  framework: '@storybook/react-native-web-vite',
  stories: ['../../../packages/ui-native/src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  docs: { defaultName: '文档' },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const { default: tailwind } = await import('@tailwindcss/postcss');
    return mergeConfig(config, {
      css: { postcss: { plugins: [tailwind()] } },
      resolve: { dedupe: ['react', 'react-dom'] },
    });
  },
};
