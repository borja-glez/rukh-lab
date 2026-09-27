import { describe, expect, it } from 'vitest';
import { computedAt, marks } from '../src/lib/llm/generation';
import { passesWithCache, passesWithoutCache } from '../src/lib/llm/kv-cache';

describe('generation marks', () => {
  it('shows the prompt idle before the first step', () => {
    expect(marks(3, 0, false)).toEqual(['idle', 'idle', 'idle']);
  });

  it('recomputes everything without a cache', () => {
    expect(marks(3, 2, false)).toEqual(['computed', 'computed', 'computed', 'computed', 'output']);
  });

  it('computes the prompt once and then only the newest token with a cache', () => {
    expect(marks(3, 1, true)).toEqual(['computed', 'computed', 'computed', 'output']);
    expect(marks(3, 3, true)).toEqual([
      'reused',
      'reused',
      'reused',
      'reused',
      'computed',
      'output',
    ]);
  });

  it('adds up to the kv-cache totals', () => {
    for (const cache of [false, true]) {
      let total = 0;
      for (let step = 1; step <= 6; step++) total += computedAt(5, step, cache);
      expect(total).toBe(cache ? passesWithCache(5, 6) : passesWithoutCache(5, 6));
    }
  });
});
