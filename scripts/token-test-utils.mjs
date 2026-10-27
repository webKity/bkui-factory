import { transform } from 'esbuild';

// Execute generated data modules after removing TypeScript syntax, without writing test artifacts.
export async function evaluateTokenModule(source) {
  const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}
