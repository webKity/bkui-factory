import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'BKUI · 组件文档',
    brandUrl: '?path=/docs/开始使用-项目介绍--docs',
    brandTarget: '_self',
    brandImage: null,
  }),
});
