import { describe, expect, it } from 'vitest';
import { HEADS, SENTENCE, attentionRow } from '../src/lib/llm/attention';

describe('toy attention', () => {
  const [who, previous] = HEADS;
  const last = SENTENCE.length - 1;

  it('has one square score matrix per head', () => {
    for (const head of HEADS) {
      expect(head.scores).toHaveLength(SENTENCE.length);
      for (const row of head.scores) expect(row).toHaveLength(SENTENCE.length);
    }
  });

  it('gives every row weights that sum to one, with or without the mask', () => {
    for (const head of HEADS) {
      for (let q = 0; q < SENTENCE.length; q++) {
        for (const causal of [true, false]) {
          const sum = attentionRow(head.scores, q, causal).reduce((a, b) => a + b, 0);
          expect(sum).toBeCloseTo(1);
        }
      }
    }
  });

  it('never looks ahead under the causal mask', () => {
    for (let q = 0; q < SENTENCE.length; q++) {
      const row = attentionRow(who.scores, q, true);
      for (let k = q + 1; k < SENTENCE.length; k++) expect(row[k]).toBe(0);
    }
    /* The first word can only see itself. */
    expect(attentionRow(who.scores, 0, true)[0]).toBe(1);
  });

  it('makes «maulló» listen mostly to «gata», and head 2 to its left neighbour', () => {
    const row = attentionRow(who.scores, last, true);
    expect(row.indexOf(Math.max(...row))).toBe(SENTENCE.indexOf('gata'));
    const prev = attentionRow(previous.scores, last, true);
    expect(prev.indexOf(Math.max(...prev))).toBe(last - 1);
  });

  it('lets «gata» reach its verb only without the mask', () => {
    const gata = SENTENCE.indexOf('gata');
    expect(attentionRow(who.scores, gata, true)[last]).toBe(0);
    const open = attentionRow(who.scores, gata, false);
    expect(open.indexOf(Math.max(...open))).toBe(last);
  });
});
