/// <reference types="vite/client" />
import { useLayoutEffect } from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import '../src/styles.css';
import './preview.css';

const themes = Object.keys(import.meta.glob('../src/components/themes/*/index.css'))
  .map(file => file.split('/').at(-2)!)
  .sort();

const ThemeDecorator: Decorator = (Story, context) => {
  useLayoutEffect(() => {
    if (context.globals.theme === 'default') document.documentElement.removeAttribute('theme');
    else document.documentElement.setAttribute('theme', context.globals.theme);
  }, [context.globals.theme]);
  return <div className="example-canvas"><Story /></div>;
};

const preview: Preview = {
  decorators: [ThemeDecorator],
  globalTypes: {
    theme: {
      description: '组件主题',
      toolbar: {
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'default', title: '默认主题' },
          ...themes.map(theme => ({ value: theme, title: theme })),
        ],
      },
    },
  },
  initialGlobals: { theme: 'default' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    docs: { codePanel: true },
    options: { storySort: { order: ['开始使用', '组件', '设计变量'] } },
    backgrounds: { disable: true },
  },
};

export default preview;
