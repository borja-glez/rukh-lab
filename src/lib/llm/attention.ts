/**
 * Toy attention for the AttentionPlayground widget of /como-funciona-un-llm/ (chapter 4).
 *
 * The scores are written by hand, not computed from Q·K: the widget is about what the weights
 * mean (who listens to whom, what the causal mask removes, why two heads see different things),
 * and real scores from a real model would bury that under noise. Each row is one query; its
 * weights are the softmax of its scores over the keys it is allowed to see.
 */
import { softmax } from './sampling';

export const SENTENCE = ['La', 'gata', 'que', 'vio', 'al', 'perro', 'maulló'];

export interface Head {
  id: string;
  name: string;
  question: string;
  /** scores[query][key]; any key not listed scores 0. */
  scores: number[][];
}

const n = SENTENCE.length;
const blank = () => Array.from({ length: n }, () => Array.from({ length: n }, () => 0));

/** Head 1: "who is this about?" Verbs and pronouns look for their subject and object. */
const who = blank();
const set = (m: number[][], q: number, k: number, v: number) => (m[q][k] = v);
set(who, 0, 0, 0.5);
set(who, 0, 1, 2.5);
set(who, 1, 0, 1);
set(who, 1, 1, 1.5);
set(who, 1, 6, 3);
set(who, 2, 1, 3);
set(who, 2, 2, 0.5);
set(who, 3, 1, 2.6);
set(who, 3, 2, 1.8);
set(who, 3, 5, 2.4);
set(who, 4, 3, 1);
set(who, 4, 5, 2.6);
set(who, 5, 3, 2.4);
set(who, 5, 4, 1.4);
set(who, 5, 5, 0.8);
set(who, 6, 1, 3.6);
set(who, 6, 5, 1.2);
set(who, 6, 0, 0.6);
set(who, 6, 6, 0.5);

/** Head 2: "what came right before?" Every word looks at its left neighbour. */
const previous = blank();
for (let q = 0; q < n; q++) {
  previous[q][q] = 1;
  if (q > 0) previous[q][q - 1] = 3.5;
}

export const HEADS: Head[] = [
  { id: 'quien', name: 'Cabeza 1', question: '¿de quién se habla?', scores: who },
  { id: 'anterior', name: 'Cabeza 2', question: '¿qué palabra va justo antes?', scores: previous },
];

/**
 * Attention weights of one query. With `causal`, keys after the query score −∞ (weight 0) and
 * the rest are renormalised, which is exactly what a decoder does.
 */
export function attentionRow(scores: number[][], query: number, causal: boolean): number[] {
  const row = scores[query];
  const allowed = row.map((_, k) => !causal || k <= query);
  const visible = row.filter((_, k) => allowed[k]);
  const weights = softmax(visible);
  let next = 0;
  return row.map((_, k) => (allowed[k] ? weights[next++] : 0));
}
