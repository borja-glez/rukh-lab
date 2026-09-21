import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO, HUB, STAGES, demoUrl, hubUrl, stageLinks } from '../src/lib/stages';

/** The stages of the P6 catalogue, one link entry each. */
const CATALOGUE = [
  'tiny-greedy',
  'small-v3-greedy',
  'medium-v4-greedy',
  'encoder-v4',
  'medium-elo',
  'medium-masters',
  'lora-e4',
  'lora-d4',
  'qwen3-pgn-qlora',
  'medium-v4-dpo-onpolicy-greedy',
  'medium-v4-grpo-greedy',
] as const;

/**
 * `?vs=` only survives the demo's query parser when `findStage` knows the id, so every `demo` here
 * must be an id of `STAGES` in `rukh-web/src/lib/registry.ts`. Checked against the sibling clone
 * when it exists (same rule as tests/tokenizer-copies.test.ts); skipped without it.
 */
const registry = resolve(__dirname, '../../rukh-web/src/lib/registry.ts');

function demoIds(): string[] {
  const source = readFileSync(registry, 'utf8');
  const start = source.indexOf('export const STAGES');
  const end = source.indexOf('export const TEST_STAGE');
  const block = source.slice(start, end);
  return Array.from(block.matchAll(/id:\s*'([^']+)'/g), (match) => match[1]);
}

describe('stage map', () => {
  it.each(CATALOGUE)('knows %s', (stage) => {
    expect(stageLinks(stage)).toBeDefined();
  });

  it('has exactly the catalogue', () => {
    expect(Object.keys(STAGES).sort()).toEqual([...CATALOGUE].sort());
  });

  it('points every stage at a chorcat/rukh-* repo', () => {
    for (const [stage, links] of Object.entries(STAGES)) {
      expect(links.repo, stage).toMatch(/^chorcat\/rukh-[a-z0-9-]+$/);
    }
  });

  it('gives the demo link only to stages the demo serves', () => {
    const withDemo = Object.entries(STAGES)
      .filter(([, links]) => links.demo)
      .map(([stage]) => stage)
      .sort();
    expect(withDemo).toEqual(
      [
        'tiny-greedy',
        'small-v3-greedy',
        'medium-v4-greedy',
        'medium-elo',
        'lora-e4',
        'lora-d4',
        'medium-v4-dpo-onpolicy-greedy',
        'medium-v4-grpo-greedy',
      ].sort(),
    );
    expect(stageLinks('encoder-v4')?.demo).toBeUndefined();
    expect(stageLinks('medium-masters')?.demo).toBeUndefined();
    expect(stageLinks('qwen3-pgn-qlora')?.demo).toBeUndefined();
  });

  it('returns undefined for a stage it does not know', () => {
    expect(stageLinks('small')).toBeUndefined();
  });

  it('builds the two URLs', () => {
    expect(hubUrl('chorcat/rukh-tiny')).toBe(`${HUB}chorcat/rukh-tiny`);
    expect(demoUrl('tiny-int8')).toBe(`${DEMO}?mode=arena&vs=tiny-int8`);
  });

  if (!existsSync(registry)) {
    it.skip(`skipped: ${registry} not found (demo ids checked only next to a rukh-web clone)`, () => {});
    return;
  }

  it('uses demo ids that rukh-web’s registry accepts for ?vs=', () => {
    const ids = demoIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const [stage, links] of Object.entries(STAGES)) {
      if (links.demo) expect(ids, `${stage} → ${links.demo}`).toContain(links.demo);
    }
  });
});
