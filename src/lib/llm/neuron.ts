/**
 * One artificial neuron, for the NeuronDial widget of /como-funciona-un-llm/ (chapter 1):
 * multiply each input by its weight, add them up, add the bias, and pass the result through a
 * non-linearity. ReLU (negative → 0) is the simplest one and the one the widget shows; the MLP of
 * a real transformer uses a smoother cousin (GELU), which the course's blocks use too.
 */

export function weightedSum(inputs: number[], weights: number[], bias: number): number {
  if (inputs.length !== weights.length) throw new Error('neuron: one weight per input');
  return inputs.reduce((sum, x, i) => sum + x * weights[i], bias);
}

export function relu(z: number): number {
  return z > 0 ? z : 0;
}

/** Dot product: how much two vectors point the same way (chapter 5 compares Q and K with it). */
export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('dot: vectors of different length');
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}
