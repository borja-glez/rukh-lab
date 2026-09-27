import { describe, expect, it } from 'vitest';
import { initBpe, pairCounts, step, tokenCount, vocabulary } from '../src/lib/llm/bpe-train';
import { draw, score, softmax, withTemperature } from '../src/lib/llm/sampling';
import { loraParams, loraShare } from '../src/lib/llm/lora';
import { passesWithCache, passesWithoutCache } from '../src/lib/llm/kv-cache';

describe('bpe-train', () => {
  const corpus = 'gato gatos gato pato';

  it('starts from characters and counts words once each', () => {
    const state = initBpe(corpus);
    expect(state.words).toEqual([
      { symbols: ['g', 'a', 't', 'o'], count: 2 },
      { symbols: ['g', 'a', 't', 'o', 's'], count: 1 },
      { symbols: ['p', 'a', 't', 'o'], count: 1 },
    ]);
    expect(tokenCount(state)).toBe(17);
  });

  it('merges the most frequent pair, first seen on a tie', () => {
    const state = initBpe(corpus);
    const [first] = pairCounts(state);
    /* a+t and t+o both appear 4 times; a+t is read first. */
    expect(first).toEqual({ pair: ['a', 't'], count: 4 });
    const next = step(state);
    expect(next.merges).toEqual([['a', 't']]);
    expect(next.words[0].symbols).toEqual(['g', 'at', 'o']);
    expect(tokenCount(next)).toBe(13);
  });

  it('stops when every word is one symbol', () => {
    let state = initBpe('ab ab');
    state = step(state);
    expect(step(state)).toBe(state);
    expect(vocabulary(state, 'ab ab')).toEqual(['a', 'b', 'ab']);
  });
});

describe('sampling', () => {
  const candidates = [
    { token: 'a', logit: 3 },
    { token: 'b', logit: 2 },
    { token: 'c', logit: 1 },
    { token: 'd', logit: -1 },
  ];

  it('softmax sums to one and keeps the order', () => {
    const p = softmax([3, 2, 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[0]).toBeGreaterThan(p[1]);
  });

  it('temperature 0 is the argmax and a high one flattens', () => {
    expect(withTemperature([1, 5, 2], 0)).toEqual([0, 1, 0]);
    const hot = withTemperature([3, 0], 10);
    expect(hot[0] - hot[1]).toBeLessThan(0.2);
  });

  it('top-k keeps k and renormalises', () => {
    const s = score(candidates, { temperature: 1, topK: 2, topP: 1 });
    expect(s.map((x) => x.kept)).toEqual([true, true, false, false]);
    expect(s[0].final + s[1].final).toBeCloseTo(1);
  });

  it('top-p keeps the smallest nucleus that reaches p, never an empty one', () => {
    const s = score(candidates, { temperature: 1, topK: 4, topP: 0.8 });
    expect(s.map((x) => x.kept)).toEqual([true, true, false, false]);
    const tiny = score(candidates, { temperature: 1, topK: 4, topP: 0.01 });
    expect(tiny.filter((x) => x.kept)).toHaveLength(1);
  });

  it('draws inside the kept set', () => {
    const s = score(candidates, { temperature: 1, topK: 2, topP: 1 });
    expect(draw(s, 0)).toBe(0);
    expect(draw(s, 0.999999)).toBe(1);
  });
});

describe('lora and kv cache arithmetic', () => {
  it('counts LoRA parameters', () => {
    expect(loraParams(512, 512, 8)).toBe(8192);
    expect(loraShare(512, 512, 8)).toBeCloseTo(0.03125);
  });

  it('counts token passes with and without a cache', () => {
    expect(passesWithoutCache(4, 3)).toBe(4 + 5 + 6);
    expect(passesWithCache(4, 3)).toBe(4 + 1 + 1);
    expect(passesWithCache(4, 0)).toBe(0);
  });
});
