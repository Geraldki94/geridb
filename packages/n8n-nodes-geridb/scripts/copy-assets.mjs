import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'dist', 'nodes', 'GeriDb');

await mkdir(target, { recursive: true });
await Promise.all([
  copyFile(
    resolve(root, 'nodes', 'GeriDb', 'GeriDb.node.json'),
    resolve(target, 'GeriDb.node.json'),
  ),
  copyFile(
    resolve(root, 'nodes', 'GeriDb', 'geridb.svg'),
    resolve(target, 'geridb.svg'),
  ),
]);
