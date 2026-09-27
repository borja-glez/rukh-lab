/**
 * A character-level bigram model trained with real gradient descent, for the ToyTraining widget
 * of /como-funciona-un-llm/ (chapter 8). The model is one table of logits, V × V: row `a` holds
 * the scores for the character that follows `a`. Training minimises the same loss as any LLM
 * (cross-entropy of the next token), full batch, with a fixed learning rate. Everything is
 * deterministic: the initial table and the samples come from a seeded generator.
 *
 * Because the loss only depends on how often each pair appears, the batch is summarised once as a
 * V × V count table and every step costs O(V²), a few hundred operations for a Spanish corpus.
 */

export const DEFAULT_CORPUS =
  'el gato duerme en el sofa. la gata come pan. el perro corre por el parque. ' +
  'la casa tiene una puerta roja. mi madre canta en la cocina. el sol sale por la mañana. ' +
  'la niña lee un libro. el tren para en la estacion. hoy llueve en la ciudad. ' +
  'el mar esta en calma. la luna sale de noche. el pan esta caliente. ' +
  'mi amigo toca la guitarra. la mesa es de madera. el cafe esta muy rico. ';

/**
 * Small enough that the loss falls smoothly over a few hundred steps (every step lowers it) and
 * the reader can watch it happen; ten times more converges in twenty steps and overshoots.
 */
export const LEARNING_RATE = 5;

/** mulberry32: a tiny seeded generator, good enough for initialisation and sampling. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ToyModel {
  vocab: string[];
  /** Logits, row-major: `w[a * V + b]` scores `b` following `a`. */
  w: Float64Array;
  /** How many times `b` follows `a` in the corpus. */
  counts: Float64Array;
  /** Number of pairs in the corpus. */
  total: number;
  step: number;
}

export function createModel(corpus: string = DEFAULT_CORPUS, seed = 7): ToyModel {
  const vocab = [...new Set(corpus)].sort((x, y) => x.localeCompare(y, 'es'));
  const index = new Map(vocab.map((c, i) => [c, i]));
  const V = vocab.length;
  const counts = new Float64Array(V * V);
  const chars = [...corpus];
  for (let i = 0; i < chars.length - 1; i++) {
    counts[index.get(chars[i])! * V + index.get(chars[i + 1])!] += 1;
  }
  const random = rng(seed);
  /* Small random logits: the model starts close to uniform, so its loss starts close to ln V. */
  const w = Float64Array.from({ length: V * V }, () => (random() - 0.5) * 0.02);
  return { vocab, w, counts, total: chars.length - 1, step: 0 };
}

function rowSoftmax(model: ToyModel, a: number, out: Float64Array): void {
  const V = model.vocab.length;
  let max = -Infinity;
  for (let b = 0; b < V; b++) max = Math.max(max, model.w[a * V + b]);
  let sum = 0;
  for (let b = 0; b < V; b++) {
    out[b] = Math.exp(model.w[a * V + b] - max);
    sum += out[b];
  }
  for (let b = 0; b < V; b++) out[b] /= sum;
}

/** Mean cross-entropy (nats) of the next character over the whole corpus. */
export function loss(model: ToyModel): number {
  const V = model.vocab.length;
  const p = new Float64Array(V);
  let total = 0;
  for (let a = 0; a < V; a++) {
    rowSoftmax(model, a, p);
    for (let b = 0; b < V; b++) {
      const n = model.counts[a * V + b];
      if (n > 0) total -= n * Math.log(p[b]);
    }
  }
  return total / model.total;
}

/**
 * The best loss a bigram can reach on this corpus: the conditional entropy of the next character
 * given the previous one, which is what the table converges to.
 */
export function bestLoss(model: ToyModel): number {
  const V = model.vocab.length;
  let total = 0;
  for (let a = 0; a < V; a++) {
    let row = 0;
    for (let b = 0; b < V; b++) row += model.counts[a * V + b];
    for (let b = 0; b < V; b++) {
      const n = model.counts[a * V + b];
      if (n > 0) total -= n * Math.log(n / row);
    }
  }
  return total / model.total;
}

/**
 * One step of gradient descent on the mean cross-entropy. The gradient of row `a` is
 * (row count × softmax − counts) / total pairs, the textbook softmax-cross-entropy gradient.
 * Returns the loss before the step, which is what a training log prints.
 */
export function trainStep(model: ToyModel, learningRate: number): number {
  const V = model.vocab.length;
  const p = new Float64Array(V);
  let total = 0;
  for (let a = 0; a < V; a++) {
    rowSoftmax(model, a, p);
    let row = 0;
    for (let b = 0; b < V; b++) row += model.counts[a * V + b];
    if (row === 0) continue;
    for (let b = 0; b < V; b++) {
      const n = model.counts[a * V + b];
      if (n > 0) total -= n * Math.log(p[b]);
      model.w[a * V + b] -= (learningRate * (row * p[b] - n)) / model.total;
    }
  }
  model.step += 1;
  return total / model.total;
}

/** Generates `length` characters starting after `start`, drawing from the model's softmax. */
export function sample(model: ToyModel, length: number, seed: number, start = ' '): string {
  const V = model.vocab.length;
  const random = rng(seed);
  const p = new Float64Array(V);
  let a = Math.max(0, model.vocab.indexOf(start));
  let out = '';
  for (let i = 0; i < length; i++) {
    rowSoftmax(model, a, p);
    const r = random();
    let acc = 0;
    let next = V - 1;
    for (let b = 0; b < V; b++) {
      acc += p[b];
      if (r < acc) {
        next = b;
        break;
      }
    }
    out += model.vocab[next];
    a = next;
  }
  return out;
}
