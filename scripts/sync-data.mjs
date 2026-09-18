#!/usr/bin/env node
/**
 * Copies the JSON the labs export (`../rukh/artifacts/web/*.json`) into `src/data/`.
 * The ML repo is a sibling clone, never a workspace dependency. No-op when the
 * folder is missing (fresh clone without the ML repo).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../rukh/artifacts/web');
const target = resolve(root, 'src/data');

if (!existsSync(source)) {
  console.log(`sync:data: ${source} not found, nothing to sync.`);
  process.exit(0);
}

mkdirSync(target, { recursive: true });
const files = readdirSync(source).filter((f) => f.endsWith('.json'));
for (const file of files) {
  copyFileSync(resolve(source, file), resolve(target, file));
  console.log(`sync:data: copied ${file}`);
}
console.log(`sync:data: ${files.length} file(s) copied to src/data/.`);
