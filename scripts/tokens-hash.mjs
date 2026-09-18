#!/usr/bin/env node
/**
 * Prints the sha256 of src/styles/tokens.css. With `--write`, updates the
 * `tokens.css sha256: <hex>` line in docs/design-system.md so the source of truth
 * and the file it documents stay in sync (tests/tokens-hash.test.ts checks it).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokensPath = resolve(root, 'src/styles/tokens.css');
const docPath = resolve(root, 'docs/design-system.md');
const LINE = /^tokens\.css sha256: [0-9a-f]{64}$/m;

const hash = createHash('sha256').update(readFileSync(tokensPath)).digest('hex');
console.log(hash);

if (process.argv.includes('--write')) {
  const doc = readFileSync(docPath, 'utf8');
  if (!LINE.test(doc)) {
    console.error(`No "tokens.css sha256: <hex>" line found in ${docPath}`);
    process.exit(1);
  }
  writeFileSync(docPath, doc.replace(LINE, `tokens.css sha256: ${hash}`));
  console.log(`Updated ${docPath}`);
}
