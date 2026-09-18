import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('design tokens', () => {
  it('src/styles/tokens.css matches the sha256 recorded in docs/design-system.md', () => {
    const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'));
    const actual = createHash('sha256').update(tokens).digest('hex');
    const doc = readFileSync(resolve(root, 'docs/design-system.md'), 'utf8');
    const match = doc.match(/^tokens\.css sha256: ([0-9a-f]{64})$/m);
    expect(match, 'docs/design-system.md must end with "tokens.css sha256: <hex>"').not.toBeNull();
    expect(actual).toBe(match?.[1]);
  });
});
