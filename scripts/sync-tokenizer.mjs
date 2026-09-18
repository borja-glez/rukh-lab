#!/usr/bin/env node
/**
 * Copies the UCI tokenizer the demo ships (`../rukh-web/src/lib/chess-lm/`) into
 * `src/lib/chess-lm/` for the course islands (TokenizerPlayground in M1).
 * No-op with a message when the demo repo or the files are missing.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../rukh-web/src/lib/chess-lm');
const target = resolve(root, 'src/lib/chess-lm');
const files = ['tokenizer.ts', 'vocab.json'];

if (!existsSync(source)) {
  console.log(`sync:tokenizer: ${source} not found, nothing to sync.`);
  process.exit(0);
}

let copied = 0;
for (const file of files) {
  const from = resolve(source, file);
  if (!existsSync(from)) {
    console.log(`sync:tokenizer: ${file} not present yet in rukh-web, skipped.`);
    continue;
  }
  mkdirSync(target, { recursive: true });
  copyFileSync(from, resolve(target, file));
  console.log(`sync:tokenizer: copied ${file}`);
  copied += 1;
}
console.log(`sync:tokenizer: ${copied} file(s) copied to src/lib/chess-lm/.`);
