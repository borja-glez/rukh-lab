#!/usr/bin/env node
/**
 * Copies the chess-lm tokenizers the demo ships (`../rukh-web/src/lib/chess-lm/`) into
 * `src/lib/chess-lm/` for the course islands (TokenizerPlayground in M1). The demo repo is a
 * sibling clone, never a workspace dependency; `tests/tokenizer-copies.test.ts` fails when the
 * copies drift from the demo's files. No-op with a message when the demo repo is missing.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../rukh-web/src/lib/chess-lm');
const target = resolve(root, 'src/lib/chess-lm');

/** Files copied verbatim; see src/lib/chess-lm/SYNC.md. */
const FILES = [
  'tokenizer.ts',
  'san-chars.ts',
  'bpe.ts',
  'squares.ts',
  'index.ts',
  'vocab.json',
  'bpe.json',
  'fixtures/games.json',
];

if (!existsSync(source)) {
  console.log(`sync:tokenizer: ${source} not found, nothing to sync.`);
  process.exit(0);
}

let copied = 0;
for (const file of FILES) {
  const from = resolve(source, file);
  if (!existsSync(from)) {
    console.log(`sync:tokenizer: ${file} not present yet in rukh-web, skipped.`);
    continue;
  }
  const to = resolve(target, file);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`sync:tokenizer: copied ${file}`);
  copied += 1;
}
console.log(`sync:tokenizer: ${copied} file(s) copied to src/lib/chess-lm/.`);
