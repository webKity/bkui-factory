// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'tailwind-preset': 'src/tailwind-preset.ts',       // Server-safe 组件
    client: 'src/client.ts',     // Client Components
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'tailwindcss'],
  esbuildOptions(options) {
    // 关键：让 esbuild 能解析 tailwindcss 的入口
    (options as any).conditions = ['style', 'browser', 'module', 'default'];
  },
});