import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const source = fileURLToPath(new URL('../packages/ui-native/src/styles.css', import.meta.url));
const output = fileURLToPath(new URL('../packages/ui-native/dist/', import.meta.url));
const result = await postcss([tailwind()]).process(await readFile(source, 'utf8'), { from: source });
await mkdir(output, { recursive: true });
await writeFile(output + 'styles.css', result.css);
