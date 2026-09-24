import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'api', 'seed.json');
const target = resolve(root, 'api', 'runtime', 'db.json');
await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Runtime database reset: ${target}`);
