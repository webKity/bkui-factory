import { mergeConfig } from 'vite';

/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  stories: ['../../../docs/**/*.mdx', '../../../docs/**/*.stories.tsx', '../../../packages/ui-react/src/components/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  typescript: { reactDocgen: 'react-docgen' },
  async viteFinal(config) {
    return mergeConfig(config, {
      // 文档使用标准 CSS；隔离尚未完成的 Tailwind/PostCSS 发布配置。
      css: { postcss: { plugins: [] } },
      resolve: { dedupe: ['react', 'react-dom'] },
    });
  },
};

export default config;
