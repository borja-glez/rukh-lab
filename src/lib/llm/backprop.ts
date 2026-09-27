/**
 * Backpropagation on the smallest chain that still has everything: x → ×w1 → ReLU → ×w2 → ŷ,
 * compared with a target y by half the squared error. Used by the BackpropByHand widget of
 * /como-funciona-un-llm/ (chapter 8); tests/llm-backprop.test.ts checks the gradients against
 * finite differences.
 */

export interface Weights {
  w1: number;
  w2: number;
}

export interface Forward {
  x: number;
  y: number;
  /** w1 · x, before the ReLU. */
  z: number;
  /** ReLU(z). */
  h: number;
  yhat: number;
  /** (ŷ − y)² / 2. */
  loss: number;
}

export interface Backward {
  /** dL/dŷ = ŷ − y: how wrong, and in which direction. */
  dyhat: number;
  /** dL/dw2 = dL/dŷ · h. */
  dw2: number;
  /** dL/dh = dL/dŷ · w2. */
  dh: number;
  /** The ReLU's slope: 1 if it let z through, 0 if it silenced it. */
  relu: 0 | 1;
  /** dL/dz = dL/dh · relu. */
  dz: number;
  /** dL/dw1 = dL/dz · x. */
  dw1: number;
}

export const INPUT = 1.5;
export const TARGET = 2;
export const START: Weights = { w1: 0.8, w2: 0.5 };
export const LEARNING_RATE = 0.1;

export function forward(w: Weights, x = INPUT, y = TARGET): Forward {
  const z = w.w1 * x;
  const h = Math.max(0, z);
  const yhat = w.w2 * h;
  return { x, y, z, h, yhat, loss: (yhat - y) ** 2 / 2 };
}

export function backward(w: Weights, f: Forward): Backward {
  const dyhat = f.yhat - f.y;
  const dw2 = dyhat * f.h;
  const dh = dyhat * w.w2;
  const relu = f.z > 0 ? 1 : 0;
  /* A silenced ReLU passes nothing back (0, not -0, so the widget never prints "−0,00"). */
  const dz = relu ? dh : 0;
  const dw1 = dz * f.x;
  return { dyhat, dw2, dh, relu, dz, dw1 };
}

/** One step of gradient descent: each weight moves against its own share of the blame. */
export function update(w: Weights, g: Backward, lr = LEARNING_RATE): Weights {
  return { w1: w.w1 - lr * g.dw1, w2: w.w2 - lr * g.dw2 };
}
