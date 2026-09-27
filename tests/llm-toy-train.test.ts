import { describe, expect, it } from 'vitest';
import {
  bestLoss,
  createModel,
  loss,
  LEARNING_RATE,
  rng,
  sample,
  trainStep,
} from '../src/lib/llm/toy-train';

describe('toy bigram training', () => {
  it('starts at about ln(V), the loss of a uniform guess', () => {
    const model = createModel();
    expect(loss(model)).toBeCloseTo(Math.log(model.vocab.length), 1);
  });

  it('lowers the loss with every step and approaches the bigram entropy', () => {
    const model = createModel();
    let previous = loss(model);
    for (let i = 0; i < 300; i++) {
      const before = trainStep(model, LEARNING_RATE);
      expect(before).toBeLessThanOrEqual(previous + 1e-9);
      previous = before;
    }
    const final = loss(model);
    expect(final).toBeLessThan(Math.log(model.vocab.length) - 0.8);
    expect(final - bestLoss(model)).toBeLessThan(0.15);
    expect(model.step).toBe(300);
  });

  it('is deterministic for a seed', () => {
    expect(rng(3)()).toBe(rng(3)());
    const a = createModel();
    const b = createModel();
    expect(sample(a, 40, 1)).toBe(sample(b, 40, 1));
    expect(sample(a, 40, 1)).toHaveLength(40);
  });

  it('only writes characters of the corpus', () => {
    const model = createModel('abab abba');
    expect([...sample(model, 30, 2)].every((c) => 'ab '.includes(c))).toBe(true);
  });
});
