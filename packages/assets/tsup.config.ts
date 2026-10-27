import { defineConfig } from 'tsup';
export default defineConfig({ entry: { icons: 'src/icons/index.ts', logo: 'src/logo.ts' }, format: ['esm', 'cjs'], dts: true, clean: true });
