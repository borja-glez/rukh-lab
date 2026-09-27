import { describe, expect, it } from 'vitest';
import { backward, forward, START, update, type Weights } from '../src/lib/llm/backprop';

const loss = (w: Weights) => forward(w).loss;

describe('backprop by hand', () => {
  it('starts from the numbers the widget shows', () => {
    const f = forward(START);
    expect(f.z).toBeCloseTo(1.2);
    expect(f.yhat).toBeCloseTo(0.6);
    expect(f.loss).toBeCloseTo(0.98);
    const g = backward(START, f);
    expect(g.dyhat).toBeCloseTo(-1.4);
    expect(g.dw2).toBeCloseTo(-1.68);
    expect(g.dh).toBeCloseTo(-0.7);
    expect(g.dw1).toBeCloseTo(-1.05);
  });

  it('matches finite differences for both weights', () => {
    const eps = 1e-6;
    for (const w of [START, { w1: 1.3, w2: -0.4 }, { w1: 0.2, w2: 2.5 }]) {
      const g = backward(w, forward(w));
      const n1 = (loss({ ...w, w1: w.w1 + eps }) - loss({ ...w, w1: w.w1 - eps })) / (2 * eps);
      const n2 = (loss({ ...w, w2: w.w2 + eps }) - loss({ ...w, w2: w.w2 - eps })) / (2 * eps);
      expect(g.dw1).toBeCloseTo(n1, 5);
      expect(g.dw2).toBeCloseTo(n2, 5);
    }
  });

  it('lowers the loss on every cycle with the default learning rate', () => {
    let w = START;
    let previous = loss(w);
    for (let i = 0; i < 10; i++) {
      w = update(w, backward(w, forward(w)));
      const now = loss(w);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });

  it('passes no blame through a silenced ReLU', () => {
    const w = { w1: -0.5, w2: 0.5 };
    const g = backward(w, forward(w));
    expect(g.relu).toBe(0);
    expect(g.dz).toBe(0);
    expect(g.dw1).toBe(0);
    expect(update(w, g).w1).toBe(w.w1);
  });
});
