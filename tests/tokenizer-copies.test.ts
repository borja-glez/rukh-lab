import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `src/lib/chess-lm/` holds copies of the demo's tokenizers (see SYNC.md), refreshed
 * with `pnpm sync:tokenizer`. Mirrors tests/tokens-hash.test.ts: when the sibling
 * `../rukh-web` clone exists, every copy must hash the same as its source; without
 * the sibling (isolated clone, CI) the check is skipped with a message.
 */
const root = resolve(__dirname, '..');
const source = resolve(root, '../rukh-web/src/lib/chess-lm');
const target = resolve(root, 'src/lib/chess-lm');

/** Same list as scripts/sync-tokenizer.mjs. */
const FILES = [
  'tokenizer.ts',
  'san-chars.ts',
  'bpe.ts',
  'index.ts',
  'vocab.json',
  'bpe.json',
  'fixtures/games.json',
];

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const hasSource = existsSync(source);

describe('chess-lm tokenizer copies', () => {
  if (!hasSource) {
    it.skip(`skipped: ${source} not found (run pnpm sync:tokenizer next to a rukh-web clone)`, () => {});
    return;
  }

  it.each(FILES)('%s matches ../rukh-web (run pnpm sync:tokenizer)', (file) => {
    const from = resolve(source, file);
    const to = resolve(target, file);
    if (!existsSync(from)) {
      /* The demo has not produced this file yet: nothing to compare. */
      expect(existsSync(to), `${file} exists here but not in rukh-web`).toBe(false);
      return;
    }
    expect(existsSync(to), `${file} missing: run pnpm sync:tokenizer`).toBe(true);
    expect(sha256(to)).toBe(sha256(from));
  });
});
