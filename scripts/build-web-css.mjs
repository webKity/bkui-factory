import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../packages/ui-react/', import.meta.url));
await mkdir(path.join(root, 'dist'), { recursive: true });
// Preserve relative CSS imports, including theme and component token files.
await cp(path.join(root, 'src'), path.join(root, 'dist'), {
  recursive: true,
  filter: source => !path.extname(source) || source.endsWith('.css'),
});
