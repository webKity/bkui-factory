export { buildThemeFiles, generateThemes, buildTokenFiles, generateTokens } from './tokens/build.mjs';
import { generateTokens } from './tokens/build.mjs';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) {
    console.error('仅支持 --check 参数');
    process.exitCode = 1;
  } else {
    generateTokens({ check: args.includes('--check') }).catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }

}
