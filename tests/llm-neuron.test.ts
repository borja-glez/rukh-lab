import { describe, expect, it } from 'vitest';
import { dot, relu, weightedSum } from '../src/lib/llm/neuron';

describe('neuron', () => {
  it('multiplies, adds and adds the bias', () => {
    expect(weightedSum([0.8, 0.3], [1.5, -1], -0.2)).toBeCloseTo(0.7);
  });

  it('ReLU keeps positives and turns negatives into zero', () => {
    expect(relu(0.7)).toBe(0.7);
    expect(relu(-1.3)).toBe(0);
    expect(relu(0)).toBe(0);
  });

  it('refuses a weight list that does not match the inputs', () => {
    expect(() => weightedSum([1, 2], [1], 0)).toThrow();
  });

  it('the dot product is large when two vectors point the same way', () => {
    expect(dot([1, 2], [1, 2])).toBe(5);
    expect(dot([1, 0], [0, 1])).toBe(0);
    expect(dot([1, 2], [-1, -2])).toBe(-5);
  });
});
