import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('theme bootstrap script', () => {
  it('its CSP hash is listed in security.csp.scriptDirective.hashes', async () => {
    const script = readFileSync(resolve(root, 'src/scripts/theme-init.js'), 'utf8');
    const expected = `sha256-${createHash('sha256').update(script).digest('base64')}`;
    const config = (await import('../astro.config.mjs')).default;
    const csp = config.security?.csp;
    expect(csp, 'security.csp must be configured').toBeTypeOf('object');
    const hashes = typeof csp === 'object' ? (csp.scriptDirective?.hashes ?? []) : [];
    expect(hashes).toContain(expected);
  });

  it('is a single line that only restores data-theme and data-guide from localStorage', () => {
    const script = readFileSync(resolve(root, 'src/scripts/theme-init.js'), 'utf8').trim();
    expect(script.split('\n')).toHaveLength(1);
    expect(script).toContain("getItem('rukh:theme')");
    expect(script).toContain("getItem('rukh:guide')");
    expect(script).toContain('dataset.theme');
    expect(script).toContain('dataset.guide');
    expect(script).not.toContain('setItem');
  });
});
